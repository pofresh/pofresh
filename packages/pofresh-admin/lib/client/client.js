/*!
 * pofresh -- commandLine Client
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */

const EventEmitter = require('events');
const SIOClient = require('../protocol/socketio/sioClient');
const protocol = require('../util/protocol');
const utils = require('../util/utils');

class Client extends EventEmitter {
    constructor(opt) {
        super();
        opt = opt || {};
        this.id = "";
        this.reqId = 1;
        this.callbacks = {};
        this.state = Client.ST_INITED;
        this.socket = null;
        this.username = opt.username || "";
        this.password = opt.password || "";
        this.md5 = opt.md5 || false;
        this.ClientClass = opt.Client || SIOClient;
    }

    connect(id, host, port, cb) {

        if(this.state > Client.ST_INITED) {
            return utils.invokeCallback(cb, "client has been connected");
        }

        console.log('try to connect ' + host + ':' + port);

        this.id = id;
        this.socket = new this.ClientClass({id});
        this.socket.on('connect', () => {
            this.state = Client.ST_CONNECTED;
            if (this.md5) {
                this.password = utils.md5(this.password);
            }
            this.socket.send('register', {
                id,
                type: "client",
                username: this.username,
                password: this.password,
                md5: this.md5
            });
        });

        this.socket.on('register', (res) => {
            if (res.code !== protocol.PRO_OK) {
                return utils.invokeCallback(cb, res.msg);
            }

            this.state = Client.ST_REGISTERED;
            utils.invokeCallback(cb);
        });

        this.socket.on('client', (msg) => {
            msg = protocol.parse(msg);
            if (msg.respId) {
                // response for request
                const cb = this.callbacks[msg.respId];
                delete this.callbacks[msg.respId];
                if (cb && typeof cb === 'function') {
                    cb(msg.error, msg.body);
                }
            } else if (msg.moduleId) {
                // notify
                this.emit(msg.moduleId, msg);
            }
        });

        this.socket.on('error', (err) => {
            if (this.state < Client.ST_CONNECTED) {
                utils.invokeCallback(cb, err);
            }
            this.emit('error', err);
        });

        this.socket.on('disconnect', (reason) => {
            this.state = Client.ST_CLOSED;
            console.log('client disconnect, reason: ', reason);
        });

        this.socket.on('reconnect', (cnt) => {
            console.log('client reconnect: ', cnt);
        });

        this.socket.connect(host, port);
    }

    request(moduleId, msg, cb) {
        const id = this.reqId++;
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        const req = protocol.composeRequest(id, moduleId, msg);
        this.callbacks[id] = cb;
        this.socket.send('client', req);
    }

    notify(moduleId, msg) {
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        const req = protocol.composeRequest(null, moduleId, msg);
        this.socket.send('client', req);
    }

    command(command, moduleId, msg, cb) {
        const id = this.reqId++;
        msg = msg || {};
        msg.clientId = this.id;
        msg.username = this.username;
        const commandReq = protocol.composeCommand(id, command, moduleId, msg);
        this.callbacks[id] = cb;
        this.socket.send('client', commandReq);
    }
}

Client.ST_INITED = 1;
Client.ST_CONNECTED = 2;
Client.ST_REGISTERED = 3;
Client.ST_CLOSED = 4;

module.exports = Client;
