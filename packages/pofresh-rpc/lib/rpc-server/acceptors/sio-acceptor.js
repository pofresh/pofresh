const logger = require('pofresh-logger').getLogger('pofresh-rpc', 'sio-acceptor');
const BaseAcceptor = require('./base-acceptor');
const sio = require('socket.io');

class Acceptor extends BaseAcceptor {
    constructor(opts, cb) {
        opts.name = 'sio-acceptor';
        opts.createServer = () => sio();
        super(opts, cb);
    }

    onConnection(socket) {
        this.sockets[socket.id] = socket;

        this.emit('connection', {
            id: socket.id,
            ip: socket.handshake.address.replace('::ffff:', '')
        });

        socket.on('message', pkg => {
            try {
                if (Array.isArray(pkg)) {
                    this.processMsgs(socket, pkg);
                } else {
                    this.processMsg(socket, pkg);
                }
            } catch (e) {
                // socke.io would broken if uncaugth the exception
                logger.error('rpc server process message error: %j', e.stack);
            }
        });

        socket.on('error', this.emit.bind(this, 'error'));
        socket.on('disconnect', _reason => this.onSocketClose(socket));
    }

    send(socket, msg) {
        socket.send(msg);
    }
}

/**
 * create acceptor
 *
 * @param opts init params
 * @param cb cb(tracer, msg, cb) callback function that would be invoked when new message arrives
 */
module.exports.create = (opts, cb) => new Acceptor(opts || {}, cb);
