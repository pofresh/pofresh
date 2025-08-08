const net = require('net');
const dgram = require('dgram');
const utils = require('../util/utils');
const Constants = require('../util/constants');
const UdpSocket = require('./udpsocket');
const Kick = require('./commands/kick');
const Handshake = require('./commands/handshake');
const Heartbeat = require('./commands/heartbeat');
const protocol = require('pofresh-protocol');
const Package = protocol.Package;
const Message = protocol.Message;
const coder = require('./common/coder');
const EventEmitter = require('events');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);

let curId = 1;

class Connector extends EventEmitter {
    constructor(port, host, opts) {
        super();
        this.opts = opts || {};
        this.type = opts.udpType || 'udp4';
        this.handshake = new Handshake(opts);
        if (!opts.heartbeat) {
            opts.heartbeat = Constants.TIME.DEFAULT_UDP_HEARTBEAT_TIME;
            opts.timeout = Constants.TIME.DEFAULT_UDP_HEARTBEAT_TIMEOUT;
        }
        this.heartbeat = new Heartbeat(utils.extends(opts, { disconnectOnTimeout: true }));
        this.clients = {};
        this.host = host;
        this.port = port;
    }

    start(cb) {
        this.tcpServer = net.createServer();
        this.socket = dgram.createSocket(this.type, (msg, peer) => {
            const key = genKey(peer);
            if (!this.clients[key]) {
                const udpsocket = new UdpSocket(curId++, this.socket, peer);
                this.clients[key] = udpsocket;

                udpsocket.on('handshake', this.handshake.handle.bind(this.handshake, udpsocket));

                udpsocket.on('heartbeat', this.heartbeat.handle.bind(this.heartbeat, udpsocket));

                udpsocket.on('disconnect', this.heartbeat.clear.bind(this.heartbeat, udpsocket.id));

                udpsocket.on('disconnect', () => {
                    delete this.clients[genKey(udpsocket.peer)];
                });

                udpsocket.on('closing', Kick.handle.bind(null, udpsocket));

                this.emit('connection', udpsocket);
            }
        });

        this.socket.on('message', (data, peer) => {
            const socket = this.clients[genKey(peer)];
            if (socket) {
                socket.emit('package', data);
            }
        });

        this.socket.on('error', err => {
            logger.error('udp socket encounters with error: %j', err.stack);
            return;
        });

        this.socket.bind(this.port, this.host);
        this.tcpServer.listen(this.port);
        process.nextTick(cb);
    }

    stop(force, cb) {
        this.socket.close();
        process.nextTick(cb);
    }

    encode(reqId, route, msg) {
        return coder.encode(reqId, route, msg);
    }

    decode(msg) {
        return coder.decode(msg);
    }
}

Connector.decode = coder.decode;
Connector.encode = coder.encode;

module.exports = Connector;

function genKey(peer) {
    return peer.address + ':' + peer.port;
}
