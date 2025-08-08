const logger = require('pofresh-logger').getLogger('pofresh-admin', 'SIOClient');
const EventEmitter = require('events');
const constants = require('../../util/constants');
const IOClient = require('socket.io-client');

class SIOClient extends EventEmitter {
    constructor(opts) {
        super();
        this.clientId = `SOCKET_ADMIN_${Date.now()}`;
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
        cb = cb || (() => {});
        let callbackInvoked = false;

        // 防止回调被多次调用
        const safeCallback = (err, result) => {
            if (!callbackInvoked) {
                callbackInvoked = true;
                cb(err, result);
            }
        };

        if (this.connected) {
            return safeCallback(new Error('SIOClient has already connected.'));
        }

        // 输入验证
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

        if (!(host && port)) {
            return safeCallback(new Error('Host and port are required'));
        }

        this.closed = false;

        // 添加连接超时
        const connectTimeout = setTimeout(() => {
            if (!callbackInvoked) {
                logger.error('Connection timeout for %s to %s:%s', this.id, host, port);
                this.setSocketClose();
                safeCallback(new Error('Connection timeout'));
            }
        }, this.timeout || 10_000);

        try {
            this.socket = IOClient(`ws://${host}:${port}`, {
                forceNew: true,
                reconnection: true,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: this.reconnectDelayMax,
                timeout: this.timeout
            });
        } catch (err) {
            clearTimeout(connectTimeout);
            return safeCallback(new Error(`Failed to create socket: ${err.message}`));
        }

        this.socket.on('register', msg => {
            try {
                this.emit('register', msg);
            } catch (err) {
                logger.error('Error handling register message:', err);
            }
        });

        this.socket.on('monitor', msg => {
            try {
                this.emit('monitor', msg);
            } catch (err) {
                logger.error('Error handling monitor message:', err);
            }
        });

        this.socket.on('client', msg => {
            try {
                this.emit('client', msg);
            } catch (err) {
                logger.error('Error handling client message:', err);
            }
        });

        this.socket.on('connect', () => {
            clearTimeout(connectTimeout);
            if (this.connected) {
                return;
            }
            this.connected = true;
            this.emit('connect');
            safeCallback();
        });

        this.socket.on('connect_error', err => {
            clearTimeout(connectTimeout);
            const errorMsg = `[SIOClient] socket connect_error, remote server ${host}:${port}`;
            logger.error('%s socket error: %s, remote server host: %s, port: %s', this.id, err, host, port);
            this.emit('error', new Error(errorMsg));
            if (!callbackInvoked) {
                safeCallback(new Error(errorMsg));
            }
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
        this.socket = undefined;
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
