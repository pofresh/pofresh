const logger = require('pofresh-logger').getLogger('pofresh-admin', 'SIOClient');
const EventEmitter = require('events');
const constants = require('../../util/constants');
const IOClient = require('socket.io-client');

class SIOClient extends EventEmitter {
    constructor(opts) {
        super();
        this.clientId = 'SOCKET_ADMIN_' + Date.now();
        this.id = opts.id;
        this.host = null;
        this.port = null;
        this.socket = null;
        this.closed = false;
        this.connected = false;
        this.reconnectDelay = opts.reconnectDelay || constants.DEFAULT_PARAM.RECONNECT_DELAY;
        this.reconnectDelayMax = opts.reconnectDelayMax || constants.DEFAULT_PARAM.RECONNECT_DELAY_MAX;
        this.timeout = opts.timeout || constants.DEFAULT_PARAM.TIMEOUT;
    }

    connect(host, port, cb) {
        cb = cb || function () {};

        if (this.connected) {
            return cb(new Error('SIOClient has already connected.'));
        }

        if (host) {
            this.host = host;
        } else {
            host = this.host;
        }

        if (port) {
            this.port = port;
        } else {
            port = this.port;
        }

        this.closed = false;

        this.socket = IOClient('ws://' + host + ':' + port, {
            // forceNew: true,
            // reconnection: false,
            reconnectionDelay: this.reconnectDelay,
            reconnectionDelayMax: this.reconnectDelayMax,
            timeout: this.timeout
        });

        this.socket.on('register', msg => this.emit('register', msg));

        this.socket.on('monitor', msg => this.emit('monitor', msg));

        this.socket.on('client', msg => this.emit('client', msg));

        this.socket.on('connect', () => {
            if (this.connected) {
                return;
            }
            this.connected = true;
            this.emit('connect');
            cb();
        });

        this.socket.on('connect_error', err => {
            this.emit('error', new Error('[SIOClient] socket connect_error, remote server ' + host + ':' + port));
            logger.error('%s socket error: %s, remote server host: %s, port: %s', this.id, err, host, port);
        });

        this.socket.on('disconnect', reason => {
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                this.setSocketClose();
                this.emit('disconnect', reason);
                logger.info(
                    '%s socket is disconnect, remote server host: %s, port: %s %s',
                    this.id,
                    host,
                    port,
                    reason
                );
            } else {
                this.emit('error', reason);
                logger.error('%s socket error: %s, remote server host: %s, port: %s', this.id, reason, host, port);
            }
        });
    }

    send(topic, msg) {
        this.socket.emit(topic, msg);
    }

    setSocketClose() {
        if (this.closed) {
            return;
        }

        this.connected = false;
        this.closed = true;
        delete this.socket;
        this.socket = null;
    }

    disconnect() {
        this.connected = false;
        this.socket.close();
    }

    exit() {
        process.exit(0);
    }
}

module.exports = SIOClient;
