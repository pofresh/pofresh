const logger = require('pofresh-logger').getLogger('pofresh-admin', 'MasterAgent');
const EventEmitter = require('events');
const Constants = require('../util/constants');
const SIOServer = require('../protocol/socketio/sioServer');
const MasterSocket = require('./masterSocket');
const protocol = require('../util/protocol');
const utils = require('../util/utils');

const ST_INITED = 1;
const ST_STARTED = 2;
const ST_CLOSED = 3;

/**
 * MasterAgent Constructor
 *
 * @class MasterAgent
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.consoleService {Object} consoleService
 *                 opts.id             {String} server id
 *                 opts.type           {String} server type, 'master', 'connector', etc.
 *                 opts.socket         {Object} socket-io object
 *                 opts.reqId          {Number} reqId add by 1
 *                 opts.callbacks      {Object} callbacks
 *                 opts.state          {Number} MasterAgent state
 * @api public
 */
class MasterAgent extends EventEmitter {
    constructor(consoleService, opts) {
        super();
        opts = opts || {};
        this.reqId = 1;
        this.idMap = {};
        this.reqMsgMap = {};
        this.typeMap = {};
        this.clients = {};
        this.sockets = {};
        this.slaveMap = {};
        this.callbacks = {};
        this.server = null;
        this.whitelist = opts.whitelist;
        this.consoleService = consoleService;
        this.ServerClass = opts.Server || SIOServer;
        this.state = ST_INITED;
    }

    /**
     * master listen to a port and handle register and request
     *
     * @param {String} port
     * @param cb
     * @api public
     */
    listen(port, cb) {
        if (this.state > ST_INITED) {
            logger.error('master agent has started or closed.');
            return;
        }

        this.state = ST_STARTED;
        this.server = new this.ServerClass();

        this.server.once('listening', () => {
            setImmediate(() => utils.invokeCallback(cb));
        });

        this.server.on('connection', socket => this.sockets[socket.id] = new MasterSocket(this, socket));

        this.server.listen(port);
    }

    /**
     * close master agent
     *
     * @api public
     */
    close() {
        if (this.state > ST_STARTED) {
            return;
        }
        this.state = ST_CLOSED;
        this.server.close();
    }

    /**
     * set module
     *
     * @param {String} moduleId module id/name
     * @param {Object} value module object
     * @api public
     */
    set(moduleId, value) {
        this.consoleService.set(moduleId, value);
    }

    /**
     * get module
     *
     * @param {String} moduleId module id/name
     * @api public
     */
    get(moduleId) {
        return this.consoleService.get(moduleId);
    }

    /**
     * getClientById
     *
     * @param {String} clientId
     * @api public
     */
    getClientById(clientId) {
        return this.clients[clientId];
    }

    /**
     * request monitor{master node} data from monitor
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @param {Function} cb function
     * @api public
     */
    request(serverId, moduleId, msg, cb) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const record = this.idMap[serverId];
        if (!record) {
            utils.invokeCallback(cb, new Error('unknown server id:' + serverId));
            return false;
        }

        const curId = this.reqId++;
        this.callbacks[curId] = cb;

        if (!this.reqMsgMap[serverId]) {
            this.reqMsgMap[serverId] = {};
        }

        this.reqMsgMap[serverId][curId] = {moduleId, msg};

        this.sendToMonitor(record.socket, curId, moduleId, msg);
        return true;
    }

    /**
     * request server data from monitor by serverInfo{host:port}
     *
     * @param {String} serverId
     * @param {Object} serverInfo
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @param {Function} cb function
     * @api public
     */
    requestServer(serverId, serverInfo, moduleId, msg, cb) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const record = this.idMap[serverId];
        if (!record) {
            utils.invokeCallback(cb, new Error('unknown server id:' + serverId));
            return false;
        }

        const curId = this.reqId++;
        this.callbacks[curId] = cb;

        if (utils.compareServer(record, serverInfo)) {
            this.sendToMonitor(record.socket, curId, moduleId, msg);
        } else {
            const slaves = this.slaveMap[serverId];
            for (let i = 0, l = slaves.length; i < l; i++) {
                if (utils.compareServer(slaves[i], serverInfo)) {
                    this.sendToMonitor(slaves[i].socket, curId, moduleId, msg);
                    break;
                }
            }
        }
        return true;
    }

    /**
     * notify a monitor{master node} by id without callback
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyById(serverId, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const record = this.idMap[serverId];
        if (!record) {
            logger.error('fail to notifyById for unknown server id:' + serverId);
            return false;
        }

        this.sendToMonitor(record.socket, null, moduleId, msg);
        return true;
    }

    /**
     * notify a monitor by server{host:port} without callback
     *
     * @param {String} serverId
     * @param {Object} serverInfo{host:port}
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyByServer(serverId, serverInfo, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const record = this.idMap[serverId];
        if (!record) {
            logger.error('fail to notifyByServer for unknown server id:' + serverId);
            return false;
        }

        if (utils.compareServer(record, serverInfo)) {
            this.sendToMonitor(record.socket, null, moduleId, msg);
        } else {
            const slaves = this.slaveMap[serverId];
            for (let i = 0, l = slaves.length; i < l; i++) {
                if (utils.compareServer(slaves[i], serverInfo)) {
                    this.sendToMonitor(slaves[i].socket, null, moduleId, msg);
                    break;
                }
            }
        }
        return true;
    }

    /**
     * notify slaves by id without callback
     *
     * @param {String} serverId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifySlavesById(serverId, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const slaves = this.slaveMap[serverId];
        if (!slaves || slaves.length === 0) {
            logger.error('fail to notifySlavesById for unknown server id:' + serverId);
            return false;
        }

        this.broadcastMonitors(slaves, moduleId, msg);
        return true;
    }

    /**
     * notify monitors by type without callback
     *
     * @param {String} type serverType
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyByType(type, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const list = this.typeMap[type];
        if (!list || list.length === 0) {
            logger.error('fail to notifyByType for unknown server type:' + type);
            return false;
        }
        this.broadcastMonitors(list, moduleId, msg);
        return true;
    }

    /**
     * notify all the monitors without callback
     *
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyAll(moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }
        this.broadcastMonitors(this.idMap, moduleId, msg);
        return true;
    }

    /**
     * notify a client by id without callback
     *
     * @param {String} clientId
     * @param {String} moduleId module id/name
     * @param {Object} msg
     * @api public
     */
    notifyClient(clientId, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }

        const record = this.clients[clientId];
        if (!record) {
            logger.error('fail to notifyClient for unknown client id:' + clientId);
            return false;
        }
        this.sendToClient(record.socket, null, moduleId, msg);
    }

    notifyCommand(command, moduleId, msg) {
        if (this.state > ST_STARTED) {
            return false;
        }
        this.broadcastCommand(this.idMap, command, moduleId, msg);
        return true;
    }

    doAuthUser(msg, socket, cb) {
        if (!msg.id) {
            // client should has a client id
            return cb(new Error('client should has a client id'));
        }

        const username = msg.username;
        if (!username) {
            // client should auth with username
            socket.send('register', {
                code: protocol.PRO_FAIL,
                msg: 'client should auth with username'
            });
            return cb(new Error('client should auth with username'));
        }

        const env = this.consoleService.env;
        this.consoleService.authUser(msg, env, (user) => {
            if (!user) {
                // client should auth with username
                socket.send('register', {
                    code: protocol.PRO_FAIL,
                    msg: 'client auth failed with username or password error'
                });
                return cb(new Error('client auth failed with username or password error'));
            }

            if (this.clients[msg.id]) {
                socket.send('register', {
                    code: protocol.PRO_FAIL,
                    msg: 'id has been registered. id:' + msg.id
                });
                return cb(new Error('id has been registered. id:' + msg.id));
            }

            logger.info('client user : ' + username + ' login to master');
            this.addConnection(msg.id, msg.type, null, user, socket);
            socket.send('register', {
                code: protocol.PRO_OK,
                msg: 'ok'
            });

            cb();
        });
    }

    doAuthServer(msg, socket, cb) {
        const env = this.consoleService.env;
        this.consoleService.authServer(msg, env, status => {
            if (status !== 'ok') {
                socket.send('register', {
                    code: protocol.PRO_FAIL,
                    msg: 'server auth failed'
                });
                cb(new Error('server auth failed'));
                return;
            }

            this.addConnection(msg.id, msg.serverType, msg.pid, msg.info, socket);

            socket.send('register', {
                code: protocol.PRO_OK,
                msg: 'ok'
            });
            msg.info = msg.info || {};
            msg.info.pid = msg.pid;
            this.emit('register', msg.info);
            cb(null);
        });
    }


    /**
     * add monitor,client to connection -- idMap
     *
     * @param {String} id
     * @param {String} type serverType
     * @param {String} pid pid
     * @param {Object} info info
     * @param {String} type serverType
     * @param {Object} socket socket-io object
     * @api private
     */
    addConnection(id, type, pid, info, socket) {
        const record = {id, type, pid, info, socket};
        if (type === Constants.TYPE_CLIENT) {
            this.clients[id] = record;
        } else {
            if (!this.idMap[id]) {
                this.idMap[id] = record;
                const list = this.typeMap[type] = this.typeMap[type] || [];
                list.push(record);
            } else {
                const slaves = this.slaveMap[id] = this.slaveMap[id] || [];
                slaves.push(record);
            }
        }
        return record;
    }

    /**
     * remove monitor,client connection -- idMap
     *
     * @param {Object} agent agent object
     * @param {String} id
     * @param {String} type serverType
     * @param {Object} info info
     * @api private
     */
    removeConnection(agent, id, type, info) {
        if (type === Constants.TYPE_CLIENT) {
            delete agent.clients[id];
        } else {
            // remove master node in idMap and typeMap
            const record = agent.idMap[id];
            if (!record) {
                return;
            }
            const _info = record.info; // info {host, port}
            if (utils.compareServer(_info, info)) {
                delete agent.idMap[id];
                const list = agent.typeMap[type];
                if (list) {
                    for (let i = 0, l = list.length; i < l; i++) {
                        if (list[i].id === id) {
                            list.splice(i, 1);
                            break;
                        }
                    }
                    if (list.length === 0) {
                        delete agent.typeMap[type];
                    }
                }
            } else {
                // remove slave node in slaveMap
                const slaves = agent.slaveMap[id];
                if (slaves) {
                    for (let i = 0, l = slaves.length; i < l; i++) {
                        if (utils.compareServer(slaves[i].info, info)) {
                            slaves.splice(i, 1);
                            break;
                        }
                    }
                    if (slaves.length === 0) {
                        delete agent.slaveMap[id];
                    }
                }
            }
        }
    }

    /**
     * send msg to monitor
     *
     * @param {Object} socket socket-io object
     * @param {Number} reqId request id
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    sendToMonitor(socket, reqId, moduleId, msg) {
        socket.send(Constants.TYPE_MONITOR, protocol.composeRequest(reqId, moduleId, msg));
    }

    /**
     * send msg to client
     *
     * @param {Object} socket socket-io object
     * @param {Number} reqId request id
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    sendToClient(socket, reqId, moduleId, msg) {
        socket.send(Constants.TYPE_CLIENT, protocol.composeRequest(reqId, moduleId, msg));
    }

    /**
     * broadcast msg to monitor
     *
     * @param {Object} records registered modules
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api private
     */
    broadcastMonitors(records, moduleId, msg) {
        msg = protocol.composeRequest(null, moduleId, msg);
        if (Array.isArray(records)) {
            records.forEach(record => record.socket.send(Constants.TYPE_MONITOR, msg));
        } else {
            for (const id in records) {
                records[id].socket.send(Constants.TYPE_MONITOR, msg);
            }
        }
    }

    broadcastCommand(records, command, moduleId, msg) {
        msg = protocol.composeCommand(null, command, moduleId, msg);
        if (Array.isArray(records)) {
            records.forEach(record => record.socket.send(Constants.TYPE_MONITOR, msg));
        } else {
            for (const id in records) {
                records[id].socket.send(Constants.TYPE_MONITOR, msg);
            }
        }
    }
}

module.exports = MasterAgent;
