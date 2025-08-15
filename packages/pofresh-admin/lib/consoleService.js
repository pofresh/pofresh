const logger = require('pofresh-logger').getLogger('pofresh-admin', 'ConsoleService');
const schedule = require('pofresh-scheduler');
const EventEmitter = require('events');
const MonitorAgent = require('./monitor/monitorAgent');
const MasterAgent = require('./master/masterAgent');
const protocol = require('./util/protocol');
const utils = require('./util/utils');
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');

const MS_OF_SECOND = 1000;

/**
 * ConsoleService Constructor
 *
 * @class ConsoleService
 * @constructor
 * @param {Object} opts construct parameter
 *                 opts.type    {String} server type, 'master', 'connector', etc.
 *                 opts.id      {String} server id
 *                 opts.host    {String} (monitor only) master server host
 *                 opts.port    {String | Number} listen port for master or master port for monitor
 *                 opts.master  {Boolean} current service is master or monitor
 *                 opts.info    {Object} more server info for current server, {id, serverType, host, port}
 * @api public
 */
class ConsoleService extends EventEmitter {
    constructor(opts) {
        super();

        // 输入验证
        if (!opts || typeof opts !== 'object') {
            throw new Error('Options must be an object');
        }

        this.port = opts.port;
        this.env = opts.env;
        this.master = opts.master;
        this.values = {};
        this.resourceManager = ErrorHandler.createResourceManager();

        this.modules = {};
        this.commands = {
            list: listCommand,
            enable: enableCommand,
            disable: disableCommand
        };

        if (this.master) {
            this.authUser = opts.authUser || utils.defaultAuthUser;
            this.authServer = opts.authServer || utils.defaultAuthServerMaster;
            this.agent = new MasterAgent(this, opts);
        } else {
            this.id = opts.id;
            this.type = opts.type;
            this.host = opts.host;
            this.authServer = opts.authServer || utils.defaultAuthServerMonitor;
            this.agent = new MonitorAgent(this, {
                id: this.id,
                type: this.type,
                info: opts.info
            });
        }

        // 设置错误处理
        this.setupErrorHandling();
    }

    /**
     * start master or monitor
     *
     * @param {Function} cb callback function
     * @api public
     */
    start(cb) {
        if (typeof cb !== 'function' && cb !== undefined) {
            throw new Error('Callback must be a function or undefined');
        }

        cb = cb || (() => {});

        const wrappedCallback = ErrorHandler.createTimeoutCallback(
            cb,
            Constants.DEFAULT_PARAM.TIMEOUT,
            'ConsoleService.start'
        );

        try {
            if (this.master) {
                this.agent.listen(this.port, err => {
                    if (err) {
                        logger.error('Failed to start master server:', err);
                        wrappedCallback.callback(err);
                        return;
                    }

                    exportEvent(this, this.agent, 'register');
                    exportEvent(this, this.agent, 'disconnect');
                    exportEvent(this, this.agent, 'reconnect');

                    logger.info('Master server started successfully on port %d', this.port);
                    process.nextTick(() => wrappedCallback.callback());
                });
            } else {
                logger.info('try to connect master: %j, %s, %j, %j', this.type, this.id, this.host, this.port);
                this.agent.connect(this.port, this.host, wrappedCallback.callback);
                exportEvent(this, this.agent, 'close');
            }

            exportEvent(this, this.agent, 'error');

            // 启用所有模块
            for (const mid in this.modules) {
                this.enable(mid);
            }

            this.resourceManager.addTimer(wrappedCallback.cleanup);
        } catch (err) {
            logger.error('Error starting ConsoleService:', err);
            wrappedCallback.callback(err);
        }
    }

    /**
     * stop console modules and stop master server
     *
     * @api public
     */
    stop() {
        try {
            logger.info('Stopping ConsoleService...');

            // 停止所有模块
            for (const mid in this.modules) {
                try {
                    this.disable(mid);
                } catch (err) {
                    logger.error('Error disabling module %s:', mid, err);
                }
            }

            // 清理定时器
            if (this.scheduleId) {
                schedule.cancelJob(this.scheduleId);
                this.scheduleId = null;
            }

            // 关闭代理
            if (this.agent) {
                try {
                    this.agent.close();
                } catch (err) {
                    logger.error('Error closing agent:', err);
                }
            }

            // 清理资源
            this.resourceManager.cleanup();
            this.modules = {};
            this.values = {};

            logger.info('ConsoleService stopped successfully');
        } catch (err) {
            logger.error('Error stopping ConsoleService:', err);
            throw err;
        }
    }

    /**
     * register a new adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @param {Object} module module object
     * @api public
     */
    register(moduleId, module) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID must be a non-empty string');
        }

        if (!module || typeof module !== 'object') {
            throw new Error('Module must be an object');
        }

        // 检查模块是否已存在
        if (this.modules[moduleId]) {
            logger.warn('Module %s already exists, overwriting...', moduleId);
        }

        this.modules[moduleId] = registerRecord(this, moduleId, module);
        logger.info('Module %s registered successfully', moduleId);
    }

    /**
     * enable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    enable(moduleId) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID must be a non-empty string');
        }

        const record = this.modules[moduleId];
        if (!record) {
            logger.warn('Module %s not found for enable', moduleId);
            return false;
        }

        if (!record.enable) {
            record.enable = true;
            addToSchedule(this, record);
            logger.info('Module %s enabled successfully', moduleId);
            return true;
        }

        logger.debug('Module %s is already enabled', moduleId);
        return false;
    }

    /**
     * disable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    disable(moduleId) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID must be a non-empty string');
        }

        const record = this.modules[moduleId];
        if (!record) {
            logger.warn('Module %s not found for disable', moduleId);
            return false;
        }

        if (record.enable) {
            record.enable = false;
            if (record.schedule && record.jobId) {
                schedule.cancelJob(record.jobId);
                record.jobId = null;
            }
            logger.info('Module %s disabled successfully', moduleId);
            return true;
        }

        logger.debug('Module %s is already disabled', moduleId);
        return false;
    }

    /**
     * call concrete module and handler(monitorHandler,masterHandler,clientHandler)
     *
     * @param {String} moduleId adminConsole id/name
     * @param {String} method handler
     * @param {Object} msg message
     * @param {Function} cb callback function
     * @api public
     */
    execute(moduleId, method, msg, cb) {
        if (!moduleId || typeof moduleId !== 'string') {
            const error = 'Module ID must be a non-empty string';
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        if (!method || typeof method !== 'string') {
            const error = 'Method must be a non-empty string';
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        const m = this.modules[moduleId];
        if (!m) {
            const error = `unknown moduleId:${moduleId}`;
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        if (!m.enable) {
            const error = `module ${moduleId} is disabled`;
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        const module = m.module;
        if (!module || typeof module[method] !== 'function') {
            const error = `module ${moduleId} does not have a method called ${method}`;
            logger.error(error);
            ErrorHandler.safeCallback(cb, new Error(error));
            return;
        }

        const log = {
            action: 'execute',
            moduleId,
            method,
            msg
        };

        const aclMsg = aclControl(this.agent, 'execute', moduleId, method, msg);
        if (aclMsg !== 0 && aclMsg !== 1) {
            log.error = aclMsg;
            this.emit('admin-log', log, aclMsg);
            ErrorHandler.safeCallback(cb, new Error(aclMsg), null);
            return;
        }

        if (method === 'clientHandler') {
            this.emit('admin-log', log);
        }

        try {
            module[method](this.agent, msg, (err, result) => {
                if (err) {
                    logger.error('Error executing module %s method %s:', moduleId, method, err);
                }
                ErrorHandler.safeCallback(cb, err, result);
            });
        } catch (err) {
            logger.error('Exception executing module %s method %s:', moduleId, method, err);
            ErrorHandler.safeCallback(cb, err, null);
        }
    }

    command(command, moduleId, msg, cb) {
        const fun = this.commands[command];
        if (!fun || typeof fun !== 'function') {
            cb(`unknown command:${command}`);
            return;
        }

        const log = {
            action: 'command',
            moduleId,
            msg
        };

        const aclMsg = aclControl(this.agent, 'command', moduleId, null, msg);
        if (aclMsg !== 0 && aclMsg !== 1) {
            log.error = aclMsg;
            this.emit('admin-log', log, aclMsg);
            cb(new Error(aclMsg), null);
            return;
        }

        this.emit('admin-log', log);
        fun(this, moduleId, msg, cb);
    }

    /**
     * set module data to a map
     *
     * @param {String} moduleId adminConsole id/name
     * @param {Object} value module data
     * @api public
     */

    set(moduleId, value) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID must be a non-empty string');
        }
        this.values[moduleId] = value;
    }

    /**
     * get module data from map
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    get(moduleId) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID must be a non-empty string');
        }
        return this.values[moduleId];
    }

    /**
     * 设置错误处理
     * @private
     */
    setupErrorHandling() {
        // 处理未捕获的异常
        process.on('uncaughtException', err => {
            logger.error('Uncaught Exception in ConsoleService:', err);
            this.emit('error', err);
        });

        // 处理未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection in ConsoleService:', reason);
            this.emit('error', new Error(`Unhandled Rejection: ${reason}`));
        });

        // 优雅关闭
        const gracefulShutdown = signal => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);
            try {
                this.stop();
                process.exit(0);
            } catch (err) {
                logger.error('Error during graceful shutdown:', err);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
}

/**
 * register a module service
 *
 * @param {Object} service consoleService object
 * @param {String} moduleId adminConsole id/name
 * @param {Object} module module object
 * @api private
 */
function registerRecord(service, moduleId, module) {
    const record = { moduleId, module, enable: false };

    if (
        module.type &&
        module.interval &&
        ((!service.master && record.module.type === 'push') || (service.master && record.module.type !== 'push'))
    ) {
        // push for monitor or pull for master(default)
        record.delay = module.delay || 0;
        record.interval = module.interval || 1;
        // normalize the arguments
        if (record.delay < 0) {
            record.delay = 0;
        }
        if (record.interval < 0) {
            record.interval = 1;
        }
        record.interval = Math.ceil(record.interval);
        record.delay *= MS_OF_SECOND;
        record.interval *= MS_OF_SECOND;
        record.schedule = true;
    }

    return record;
}

/**
 * schedule console module
 *
 * @param {Object} service consoleService object
 * @param {Object} record  module object
 * @api private
 */
function addToSchedule(service, record) {
    if (record?.schedule) {
        record.jobId = schedule.scheduleJob(
            {
                start: Date.now() + record.delay,
                period: record.interval
            },
            doScheduleJob,
            {
                service,
                record
            }
        );
    }
}

/**
 * run schedule job
 *
 * @param {Object} args argments
 * @api private
 */
function doScheduleJob(args) {
    const service = args.service;
    const record = args.record;
    if (!(service && record && record.module && record.enable)) {
        return;
    }

    if (service.master) {
        record.module.masterHandler(service.agent, null, err => {
            if (err) {
                logger.error('interval push should not have a callback.', err);
            }
        });
    } else {
        record.module.monitorHandler(service.agent, null, err => {
            if (err) {
                logger.error('interval push should not have a callback.', err);
            }
        });
    }
}

/**
 * export closure function out
 *
 * @param {Function} outer outer function
 * @param {Function} inner inner function
 * @param {object} event
 * @api private
 */
function exportEvent(outer, inner, event) {
    inner.on(event, () => {
        const args = Array.prototype.slice.call(arguments, 0);
        args.unshift(event);
        outer.emit.apply(outer, args);
    });
}

/**
 * List current modules
 */
function listCommand(consoleService, _moduleId, _msg, cb) {
    const modules = consoleService.modules;
    const result = [];
    for (const moduleId in modules) {
        if (/^__\w+__$/.test(moduleId)) {
            continue;
        }
        result.push(moduleId);
    }
    cb(null, { modules: result });
}

/**
 * enable module in current server
 */
function enableCommand(consoleService, moduleId, msg, cb) {
    if (!moduleId) {
        logger.error(`fail to enable admin module for ${moduleId}`);
        cb('empty moduleId');
        return;
    }

    if (!consoleService.modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    consoleService.enable(moduleId);
    if (consoleService.master) {
        consoleService.agent.notifyCommand('enable', moduleId, msg);
    }
    cb(null, protocol.PRO_OK);
}

/**
 * disable module in current server
 */
function disableCommand(consoleService, moduleId, msg, cb) {
    if (!moduleId) {
        logger.error(`fail to disable admin module for ${moduleId}`);
        cb('empty moduleId');
        return;
    }

    if (!consoleService.modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    consoleService.disable(moduleId);

    if (consoleService.master) {
        consoleService.agent.notifyCommand('disable', moduleId, msg);
    }
    cb(null, protocol.PRO_OK);
}

function aclControl(agent, action, moduleId, method, msg) {
    if (action === 'execute') {
        if (method !== 'clientHandler' || moduleId !== '__console__') {
            return 0;
        }

        const signal = msg.signal;
        if (!(signal && (signal === 'stop' || signal === 'add' || signal === 'kill'))) {
            return 0;
        }
    }

    const clientId = msg.clientId;
    if (!clientId) {
        return 'Unknow clientId';
    }

    const _client = agent.getClientById(clientId);
    if (_client?.info?.level) {
        const level = _client.info.level;
        if (level > 1) {
            return 'Command permission denied';
        }
    } else {
        return 'Client info error';
    }
    return 1;
}

/**
 * Create master ConsoleService
 *
 * @param {Object} opts construct parameter
 *                      opts.port {String | Number} listen port for master console
 */
module.exports.createMasterConsole = opts => {
    opts = opts || {};
    opts.master = true;
    return new ConsoleService(opts);
};

/**
 * Create monitor ConsoleService
 *
 * @param {Object} opts construct parameter
 *                      opts.type {String} server type, 'master', 'connector', etc.
 *                      opts.id {String} server id
 *                      opts.host {String} master server host
 *                      opts.port {String | Number} master port
 */
module.exports.createMonitorConsole = opts => {
    opts = opts || {};
    return new ConsoleService(opts);
};
