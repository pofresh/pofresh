const logger = require('pofresh-logger').getLogger('pofresh-admin', 'MasterSocket');
const Constants = require('../util/constants');
const protocol = require('../util/protocol');

class MasterSocket {
    constructor(agent, socket) {
        this.id = null;
        this.type = null;
        this.info = null;
        this.agent = agent;
        this.socket = socket;
        this.username = null;
        this.registered = false;
        socket.on('register', this.onRegister.bind(this));
        socket.on('monitor', this.onMonitor.bind(this));
        socket.on('client', this.onClient.bind(this));
        socket.on('reconnect', this.onReconnect.bind(this));
        socket.on('disconnect', this.onDisconnect.bind(this));
        socket.on('close', this.onDisconnect.bind(this));
        socket.on('error', this.onError.bind(this));
    }

    onRegister(msg) {
        if (!msg || !msg.type) {
            return;
        }
        const serverId = msg.id;
        const serverType = msg.type;
        const socket = this.socket;
        if (serverType === Constants.TYPE_CLIENT) {
            // client connection not join the map
            this.id = serverId;
            this.type = serverType;
            this.info = 'client';
            this.agent.doAuthUser(msg, socket, err => {
                if (err) {
                    return socket.disconnect();
                }
                this.username = msg.username;
                this.registered = true;
            });
            return;
        }

        if (serverType === Constants.TYPE_MONITOR) {
            if (!serverId) {
                return;
            }

            // if is a normal server
            this.id = serverId;
            this.type = msg.serverType;
            this.info = msg.info;
            this.agent.doAuthServer(msg, socket, err => {
                if (err) {
                    return socket.disconnect();
                }

                this.registered = true;
            });

            this.repushQosMessage(serverId);
            return;
        } // end of if(serverType === 'monitor')

        socket.send('register', {
            code: protocol.PRO_FAIL,
            msg: 'unknown auth master type'
        });

        socket.disconnect();
    }

    onMonitor(msg) {
        const socket = this.socket;
        if (!this.registered) {
            // not register yet, ignore any message
            // kick connections
            socket.disconnect();
            return;
        }

        const type = this.type;
        if (type === Constants.TYPE_CLIENT) {
            logger.error('invalid message from monitor, but current connect type is client.');
            return;
        }

        msg = protocol.parse(msg);
        const respId = msg.respId;
        if (respId) {
            if (this.agent.reqMsgMap[this.id]) {
                delete this.agent.reqMsgMap[this.id][respId];
            }

            // a response from monitor
            const cb = this.agent.callbacks[respId];
            delete this.agent.callbacks[respId];
            if (!cb) {
                logger.warn('unknown resp id:' + respId);
                return;
            }
            return cb(msg.error, msg.body);
        }

        // a request or a notify from monitor
        this.agent.consoleService.execute(msg.moduleId, 'masterHandler', msg.body, (err, res) => {
            if (protocol.isRequest(msg)) {
                const resp = protocol.composeResponse(msg, err, res);
                if (resp) {
                    socket.send('monitor', resp);
                }
            }
        });
    }

    onClient(msg) {
        const socket = this.socket;
        if (!this.registered) {
            // not register yet, ignore any message
            // kick connections
            return socket.disconnect();
        }

        const type = this.type;
        if (type !== Constants.TYPE_CLIENT) {
            logger.error('invalid message to client, but current connect type is ' + type);
            return;
        }

        msg = protocol.parse(msg);

        const msgCommand = msg.command;
        const msgModuleId = msg.moduleId;
        const msgBody = msg.body;

        if (msgCommand) {
            // a command from client
            this.agent.consoleService.command(msgCommand, msgModuleId, msgBody, (err, res) => {
                if (protocol.isRequest(msg)) {
                    const resp = protocol.composeResponse(msg, err, res);
                    if (resp) {
                        socket.send('client', resp);
                    }
                }
            });
        } else {
            // a request or a notify from client
            // and client should not have any response to master for master would not request anything from client
            this.agent.consoleService.execute(msgModuleId, 'clientHandler', msgBody, (err, res) => {
                if (protocol.isRequest(msg)) {
                    const resp = protocol.composeResponse(msg, err, res);
                    if (resp) {
                        socket.send('client', resp);
                    }
                }
            });
        }
    }

    onReconnect(msg, pid) {
        // reconnect a new connection
        if (!msg || !msg.type) {
            return;
        }

        const serverId = msg.id;
        if (!serverId) {
            return;
        }

        const socket = this.socket;

        // if is a normal server
        if (this.agent.idMap[serverId]) {
            // id has been registered
            socket.send('reconnect_ok', {
                code: protocol.PRO_FAIL,
                msg: 'id has been registered. id:' + serverId
            });
            return;
        }

        const msgServerType = msg.serverType;
        this.agent.addConnection(serverId, msgServerType, msg.pid, msg.info, socket);

        this.id = serverId;
        this.type = msgServerType;
        this.registered = true;
        msg.info.pid = pid;
        this.info = msg.info;
        socket.send('reconnect_ok', {
            code: protocol.PRO_OK,
            msg: 'ok'
        });

        this.agent.emit('reconnect', msg.info);

        this.repushQosMessage(serverId);
    }

    onDisconnect(reason) {
        const socket = this.socket;
        if (socket) {
            delete this.agent.sockets[socket.id];
        }

        if (!this.registered) {
            return;
        }

        const id = this.id;
        const type = this.type;
        const info = this.info;
        const username = this.username;

        logger.debug('disconnect %s, type:%s, id:%s %j,%s', reason, id, type, info.host, info.pid);
        if (this.registered) {
            this.agent.removeConnection(this.agent, id, type, info);
            this.agent.emit('disconnect', id, type, info, reason);
        }

        if (type === Constants.TYPE_CLIENT && this.registered) {
            logger.info('client user ' + username + ' exit');
        }

        this.registered = false;
        this.id = null;
        this.type = null;
    }

    repushQosMessage(serverId) {
        const socket = this.socket;
        // repush qos message
        const qosMsgs = this.agent.reqMsgMap[serverId];

        if (!qosMsgs) {
            return;
        }

        logger.debug('repush qos message %j', qosMsgs);

        for (const reqId in qosMsgs) {
            const qosMsg = qosMsgs[reqId];
            const moduleId = qosMsg.moduleId;
            const msg = qosMsg.msg;

            this.agent.sendToMonitor(socket, reqId, moduleId, msg);
        }
    }

    onError(err) {
        logger.error('server %s error %s', this.id, err.stack);
        // this.onDisconnect();
    }
}

module.exports = MasterSocket;
