const logger = require('pofresh-logger').getLogger('pofresh-admin', 'ConsoleService');
const schedule = require('pofresh-scheduler');
const EventEmitter = require('events');
const MonitorAgent = require('./monitor/monitorAgent');
const MasterAgent = require('./master/masterAgent');
const protocol = require('./util/protocol');
const utils = require('./util/utils');

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
        this.port = opts.port;
        this.env = opts.env;
        this.master = opts.master;
        this.values = {};

        this.modules = {};
        this.commands = {
            'list': listCommand,
            'enable': enableCommand,
            'disable': disableCommand
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
            this.agent = new MonitorAgent(this, {id: this.id, type: this.type, info: opts.info});
        }
    }

    /**
     * start master or monitor
     *
     * @param {Function} cb callback function
     * @api public
     */
    start(cb) {
        if (this.master) {
            this.agent.listen(this.port, (err) => {
                if (!!err) {
                    utils.invokeCallback(cb, err);
                    return;
                }

                exportEvent(this, this.agent, 'register');
                exportEvent(this, this.agent, 'disconnect');
                exportEvent(this, this.agent, 'reconnect');
                process.nextTick(() => utils.invokeCallback(cb));
            });
        } else {
            logger.info('try to connect master: %j, %s, %j, %j', this.type, this.id, this.host, this.port);
            this.agent.connect(this.port, this.host, cb);
            exportEvent(this, this.agent, 'close');
        }

        exportEvent(this, this.agent, 'error');

        for (const mid in this.modules) {
            this.enable(mid);
        }
    }

    /**
     * stop console modules and stop master server
     *
     * @api public
     */
    stop() {
        for (const mid in this.modules) {
            this.disable(mid);
        }
        this.agent.close();
    }

    /**
     * register a new adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @param {Object} module module object
     * @api public
     */
    register(moduleId, module) {
        this.modules[moduleId] = registerRecord(this, moduleId, module);
    }

    /**
     * enable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    enable(moduleId) {
        const record = this.modules[moduleId];
        if (record && !record.enable) {
            record.enable = true;
            addToSchedule(this, record);
            return true;
        }
        return false;
    }

    /**
     * disable adminConsole module
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    disable(moduleId) {
        const record = this.modules[moduleId];
        if (record && record.enable) {
            record.enable = false;
            if (record.schedule && record.jobId) {
                schedule.cancelJob(record.jobId);
                record.jobId = null;
            }
            return true;
        }
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
        const m = this.modules[moduleId];
        if (!m) {
            logger.error('unknown module: %j.', moduleId);
            cb('unknown moduleId:' + moduleId);
            return;
        }

        if (!m.enable) {
            logger.error('module %j is disable.', moduleId);
            cb('module ' + moduleId + ' is disable');
            return;
        }

        const module = m.module;
        if (!module || typeof module[method] !== 'function') {
            logger.error('module %j dose not have a method called %j.', moduleId, method);
            cb('module ' + moduleId + ' dose not have a method called ' + method);
            return;
        }

        const log = {
            action: 'execute', moduleId, method, msg
        };

        const aclMsg = aclControl(this.agent, 'execute', moduleId, method, msg);
        if (aclMsg !== 0 && aclMsg !== 1) {
            log.error = aclMsg;
            this.emit('admin-log', log, aclMsg);
            cb(new Error(aclMsg), null);
            return;
        }

        if (method === 'clientHandler') {
            this.emit('admin-log', log);
        }
        module[method](this.agent, msg, cb);
    }

    command(command, moduleId, msg, cb) {
        const fun = this.commands[command];
        if (!fun || typeof fun !== 'function') {
            cb('unknown command:' + command);
            return;
        }

        const log = {
            action: 'command', moduleId, msg
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
        this.values[moduleId] = value;
    }

    /**
     * get module data from map
     *
     * @param {String} moduleId adminConsole id/name
     * @api public
     */
    get(moduleId) {
        return this.values[moduleId];
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
    const record = {moduleId, module, enable: false};

    if (module.type && module.interval) {
        if (!service.master && record.module.type === 'push' || service.master && record.module.type !== 'push') {
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
    if (record && record.schedule) {
        record.jobId = schedule.scheduleJob({
            start: Date.now() + record.delay, period: record.interval
        }, doScheduleJob, {
            service, record
        });
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
    if (!service || !record || !record.module || !record.enable) {
        return;
    }

    if (service.master) {
        record.module.masterHandler(service.agent, null, (err) => {
            if (err) {
                logger.error('interval push should not have a callback.', err);
            }
        });
    } else {
        record.module.monitorHandler(service.agent, null, (err) => {
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
    inner.on(event, function () {
        const args = Array.prototype.slice.call(arguments, 0);
        args.unshift(event);
        outer.emit.apply(outer, args);
    });
}

/**
 * List current modules
 */
function listCommand(consoleService, moduleId, msg, cb) {
    const modules = consoleService.modules;
    const result = [];
    for (const moduleId in modules) {
        if (/^__\w+__$/.test(moduleId)) {
            continue;
        }
        result.push(moduleId);
    }
    cb(null, {modules: result});
}

/**
 * enable module in current server
 */
function enableCommand(consoleService, moduleId, msg, cb) {
    if (!moduleId) {
        logger.error('fail to enable admin module for ' + moduleId);
        cb('empty moduleId');
        return;
    }

    if (!consoleService.modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    consoleService.enable(moduleId);
    if (consoleService.master) {
        consoleService.agent.notifyCommand("enable", moduleId, msg);
    }
    cb(null, protocol.PRO_OK);
}

/**
 * disable module in current server
 */
function disableCommand(consoleService, moduleId, msg, cb) {
    if (!moduleId) {
        logger.error('fail to disable admin module for ' + moduleId);
        cb('empty moduleId');
        return;
    }

    if (!consoleService.modules[moduleId]) {
        cb(null, protocol.PRO_FAIL);
        return;
    }

    consoleService.disable(moduleId);

    if (consoleService.master) {
        consoleService.agent.notifyCommand("disable", moduleId, msg);
    }
    cb(null, protocol.PRO_OK);

}

function aclControl(agent, action, moduleId, method, msg) {
    if (action === 'execute') {
        if (method !== 'clientHandler' || moduleId !== '__console__') {
            return 0;
        }

        const signal = msg.signal;
        if (!signal || !(signal === 'stop' || signal === 'add' || signal === 'kill')) {
            return 0;
        }
    }

    const clientId = msg.clientId;
    if (!clientId) {
        return 'Unknow clientId';
    }

    const _client = agent.getClientById(clientId);
    if (_client && _client.info && _client.info.level) {
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
module.exports.createMasterConsole = function (opts) {
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
module.exports.createMonitorConsole = function (opts) {
    opts = opts || {};
    return new ConsoleService(opts);
};
