const logger = require('pofresh-logger').getLogger('pofresh-admin', 'MonitorAgent');
const Client = require('../protocol/socketio/sioClient');
const EventEmitter = require('events');
const protocol = require('../util/protocol');
const ErrorHandler = require('../util/errorHandler');
const Constants = require('../util/constants');

const ST_INITED = 1;
const ST_CONNECTED = 2;
const ST_REGISTERED = 3;
const ST_CLOSED = 4;

/**
 * MonitorAgent Constructor
 *
 * @class MasterAgent
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.consoleService {Object} consoleService
 *                 opts.id             {String} server id
 *                 opts.type           {String} server type, 'master', 'connector', etc.
 *                 opts.info           {Object} more server info for current server, {id, serverType, host, port}
 * @api public
 */
class MonitorAgent extends EventEmitter {
    constructor(consoleService, opts) {
        super();

        // 输入验证
        if (!consoleService) {
            throw new Error('ConsoleService is required');
        }

        if (!opts || typeof opts !== 'object') {
            throw new Error('Options must be an object');
        }

        this.reqId = 1;
        this.opts = opts;
        this.id = opts.id;
        this.socket = null;
        this.callbacks = {};
        this.type = opts.type;
        this.info = opts.info;
        this.state = ST_INITED;
        this.consoleService = consoleService;
        this.Client = opts.Client || Client;
        this.resourceManager = ErrorHandler.createResourceManager();

        // 设置错误处理
        this.setupErrorHandling();
    }

    /**
     * register and connect to master server
     *
     * @param {String} port
     * @param {String} host
     * @param {Function} cb callback function
     * @api public
     */
    connect(port, host, cb) {
        if (this.state > ST_INITED) {
            const err = new Error('monitor client has connected or closed.');
            ErrorHandler.safeCallback(cb, err);
            return;
        }

        // 输入验证
        if (!port || typeof port !== 'number' || port <= 0) {
            const err = new Error('Port must be a positive number');
            ErrorHandler.safeCallback(cb, err);
            return;
        }

        if (!host || typeof host !== 'string') {
            const err = new Error('Host must be a non-empty string');
            ErrorHandler.safeCallback(cb, err);
            return;
        }

        cb = cb || (() => {});
        let callbackInvoked = false;

        // 防止回调被多次调用
        const safeCallback = (err, result) => {
            if (!callbackInvoked) {
                callbackInvoked = true;
                ErrorHandler.safeCallback(cb, err, result);
            }
        };

        try {
            this.socket = new this.Client(this.opts);
            this.resourceManager.addResource(this.socket);
        } catch (err) {
            return safeCallback(new Error(`Failed to create client socket: ${err.message}`));
        }

        // 添加连接超时
        const connectTimeout = setTimeout(() => {
            if (!callbackInvoked) {
                logger.error('Connection timeout for server %j %j', this.id, this.type);
                safeCallback(new Error('Connection timeout'));
            }
        }, Constants.DEFAULT_PARAM.TIMEOUT);

        this.socket.on('register', msg => {
            clearTimeout(connectTimeout);
            if (msg && msg.code === protocol.PRO_OK) {
                this.state = ST_REGISTERED;
                safeCallback();
            } else {
                this.emit('close');
                logger.error('server %j %j register master failed', this.id, this.type);
                safeCallback(new Error('Registration failed'));
            }
        });

        this.socket.on('monitor', msg => {
            if (this.state !== ST_REGISTERED) {
                return;
            }

            msg = protocol.parse(msg);

            if (msg.command) {
                // a command from master
                this.consoleService.command(msg.command, msg.moduleId, msg.body, (err, res) => {
                    //notify should not have a callback
                    if (err) {
                        return logger.error('command error: ', err);
                    }
                    logger.debug('command call back:', res);
                });
            } else {
                const respId = msg.respId;
                if (respId) {
                    // a response from monitor
                    const respCb = this.callbacks[respId];
                    if (!respCb) {
                        logger.warn(`unknown resp id:${respId}`);
                        return;
                    }
                    delete this.callbacks[respId];
                    respCb(msg.error, msg.body);
                    return;
                }

                // request from master
                this.consoleService.execute(msg.moduleId, 'monitorHandler', msg.body, (err, res) => {
                    if (protocol.isRequest(msg)) {
                        const resp = protocol.composeResponse(msg, err, res);
                        if (resp) {
                            this.socket.send('monitor', resp);
                        }
                    }
                });
            }
        });

        this.socket.on('connect', () => {
            if (this.state > ST_INITED) {
                //ignore reconnect
                return;
            }
            this.state = ST_CONNECTED;
            const req = {
                id: this.id,
                type: 'monitor',
                serverType: this.type,
                pid: process.pid,
                info: this.info
            };
            const authServer = this.consoleService.authServer;
            const env = this.consoleService.env;
            authServer(req, env, token => {
                req.token = token;
                this.socket.send('register', req);
            });
        });

        this.socket.on('error', err => {
            if (this.state < ST_CONNECTED) {
                // error occurs during connecting stage
                clearTimeout(connectTimeout);
                safeCallback(err);
            } else {
                logger.error('Monitor agent socket error:', err);
                this.emit('error', err);
            }
        });

        this.socket.on('disconnect', reason => {
            this.state = ST_CLOSED;
            this.emit('close', reason);
        });

        this.socket.on('reconnect', () => {
            this.state = ST_CONNECTED;
            const req = {
                id: this.id,
                type: 'monitor',
                info: this.info,
                pid: process.pid,
                serverType: this.type
            };

            this.socket.send('reconnect', req);
        });

        this.socket.on('reconnect_ok', msg => {
            if (msg && msg.code === protocol.PRO_OK) {
                this.state = ST_REGISTERED;
            }
        });

        this.socket.connect(host, port);
        this.resourceManager.addTimer(connectTimeout);
    }

    /**
     * close monitor agent
     *
     * @api public
     */
    close() {
        if (this.state >= ST_CLOSED) {
            logger.debug('Monitor agent already closed or closing');
            return;
        }

        try {
            logger.info('Closing monitor agent...');
            this.state = ST_CLOSED;

            // 清理所有回调
            this.clearCallbacks();

            // 断开socket连接
            if (this.socket) {
                this.socket.disconnect();
            }

            // 清理资源
            this.resourceManager.cleanup();

            logger.info('Monitor agent closed successfully');
        } catch (err) {
            logger.error('Error closing monitor agent:', err);
            this.emit('error', err);
        }
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
     * notify master server without callback
     *
     * @param {String} moduleId module id/name
     * @param {Object} msg message
     * @api public
     */
    notify(moduleId, msg) {
        if (this.state !== ST_REGISTERED) {
            logger.error(`agent can not notify now, state:${this.state}`);
            return;
        }
        this.socket.send('monitor', protocol.composeRequest(null, moduleId, msg));
    }

    request(moduleId, msg, cb) {
        if (this.state !== ST_REGISTERED) {
            logger.error(`agent can not request now, state:${this.state}`);
            ErrorHandler.safeCallback(cb, new Error('Agent not registered'));
            return;
        }

        if (!moduleId || typeof moduleId !== 'string') {
            const error = 'Module ID must be a non-empty string';
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        const reqId = this.reqId++;
        this.callbacks[reqId] = cb;

        try {
            this.socket.send('monitor', protocol.composeRequest(reqId, moduleId, msg));
        } catch (err) {
            logger.error('Error sending request:', err);
            delete this.callbacks[reqId];
            ErrorHandler.safeCallback(cb, err);
        }
    }

    /**
     * 清理所有回调
     * @private
     */
    clearCallbacks() {
        for (const reqId in this.callbacks) {
            const callback = this.callbacks[reqId];
            if (typeof callback === 'function') {
                try {
                    callback(new Error('Connection closed'));
                } catch (err) {
                    logger.error('Error in callback cleanup:', err);
                }
            }
            delete this.callbacks[reqId];
        }
    }

    /**
     * 设置错误处理
     * @private
     */
    setupErrorHandling() {
        // 监听未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection in MonitorAgent:', reason);
            this.emit('error', new Error(`Unhandled Rejection: ${reason}`));
        });
    }
}

module.exports = MonitorAgent;
