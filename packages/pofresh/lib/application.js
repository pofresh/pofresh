/*!
 * pofresh -- proto
 * Copyright(c) 2020 ljhxai <ljhxai@163.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
const fs = require('fs');
const path = require('path');
const utils = require('./util/utils');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const EventEmitter = require('events');
const events = require('./util/events');
const appUtil = require('./util/appUtil');
const Constants = require('./util/constants');
const appManager = require('./common/manager/appManager');
/**
 * Application prototype.
 *
 * @module
 */
const Application = {};

// Top-level regex constants
const JS_FILE_REGEX = /\.js$/;

/**
 * Application states
 */
const STATE_INITED = 1; // app has inited
const STATE_START = 2; // app start
const STATE_STARTED = 3; // app has started
const STATE_STOPED = 4; // app has stoped

/**
 * Initialize the server.
 *
 *   - setup default configuration
 */
Application.init = function (opts = {}) {
    this.loaded = []; // loaded component list
    this.components = {}; // name -> component map
    this.settings = {}; // collection keep set/get
    const base = opts.base || path.dirname(require.main.filename);
    this.set(Constants.RESERVED.BASE, base, true);
    this.event = new EventEmitter(); // event object to sub/pub events

    // current server info
    this.serverId = null; // current server id
    this.serverType = null; // current server type
    this.curServer = null; // current server info
    this.startTime = null; // current server start time

    // global server infos
    this.master = null; // master server info
    this.servers = {}; // current global server info maps, id -> info
    this.serverTypeMaps = {}; // current global type maps, type -> [info]
    this.serverTypes = []; // current global server type list
    this.lifecycleCbs = {}; // current server custom lifecycle callbacks
    this.clusterSeq = {}; // cluster id seqence

    appUtil.defaultConfiguration(this);

    this.state = STATE_INITED;
    logger.info('application inited: %j', this.getServerId());
};

/**
 * Get application base path
 *
 *  // cwd: /home/game/
 *  pofresh start
 *  // app.getBase() -> /home/game
 *
 * @return {String} application base path
 *
 * @memberOf Application
 */
Application.getBase = function () {
    return this.get(Constants.RESERVED.BASE);
};

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 * Example:
 *
 *  app.set('key1', 'value1');
 *  app.get('key1');  // 'value1'
 *  app.key1;         // undefined
 *
 *  app.set('key2', 'value2', true);
 *  app.get('key2');  // 'value2'
 *  app.key2;         // 'value2'
 *
 * @param {String} setting the setting of application
 * @param {String} val the setting's value
 * @param {Boolean} attach whether attach the settings to application
 * @return {Server|Mixed} for chaining, or the setting value
 * @memberOf Application
 */
Application.set = function (setting, val, attach = false) {
    if (setting === undefined) {
        return this;
    }
    this.settings[setting] = val;
    if (attach) {
        this[setting] = val;
    }
    return this;
};

/**
 * Get property from setting
 *
 * @param {String} setting application setting
 * @return {String} val
 * @memberOf Application
 */
Application.get = function (setting) {
    return this.settings[setting];
};

/**
 * Check if `setting` is enabled.
 *
 * @param {String} setting application setting
 * @return {Boolean}
 * @memberOf Application
 */
Application.enabled = function (setting) {
    return !!this.get(setting);
};

/**
 * Check if `setting` is disabled.
 *
 * @param {String} setting application setting
 * @return {Boolean}
 * @memberOf Application
 */
Application.disabled = function (setting) {
    return !this.get(setting);
};

/**
 * Enable `setting`.
 *
 * @param {String} setting application setting
 * @return {app} for chaining
 * @memberOf Application
 */
Application.enable = function (setting) {
    return this.set(setting, true);
};

/**
 * Disable `setting`.
 *
 * @param {String} setting application setting
 * @return {app} for chaining
 * @memberOf Application
 */
Application.disable = function (setting) {
    return this.set(setting, false);
};

/**
 * Override require method in application
 *
 * @param {String} relative path of file
 *
 * @memberOf Application
 */
Application.require = ph => require(path.join(Application.getBase(), ph));

/**
 * Configure logger with {$base}/config/log4js.json
 *
 * @param {Object} jsLogger pofresh-logger instance without configuration
 *
 * @memberOf Application
 */
Application.configureLogger = function (jsLogger) {
    if (process.env.pofresh_LOGGER !== 'off') {
        const base = this.getBase();
        const env = this.get(Constants.RESERVED.ENV);
        const originPath = path.join(base, Constants.FILEPATH.LOG);
        const presentPath = path.join(base, Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
        if (fs.existsSync(originPath)) {
            jsLogger.configure(originPath, { serverId: this.serverId, base });
        } else if (fs.existsSync(presentPath)) {
            jsLogger.configure(presentPath, { serverId: this.serverId, base });
        } else {
            jsLogger.error('logger file path configuration is error.');
        }
    }
};

/**
 * add a filter to before and after filter
 *
 * @param {Object} filter provide before and after filter method.
 *                        A filter should have two methods: before and after.
 * @memberOf Application
 */
Application.filter = function (filter) {
    this.before(filter);
    this.after(filter);
};

/**
 * Add before filter.
 *
 * @param {Object|Function} bf before fileter, bf(msg, session, next)
 * @memberOf Application
 */
Application.before = function (bf) {
    addFilter(this, Constants.KEYWORDS.BEFORE_FILTER, bf);
};

/**
 * Add after filter.
 *
 * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
 * @memberOf Application
 */
Application.after = function (af) {
    addFilter(this, Constants.KEYWORDS.AFTER_FILTER, af);
};

/**
 * add a global filter to before and after global filter
 *
 * @param {Object} filter provide before and after filter method.
 *                        A filter should have two methods: before and after.
 * @memberOf Application
 */
Application.globalFilter = function (filter) {
    this.globalBefore(filter);
    this.globalAfter(filter);
};

/**
 * Add global before filter.
 *
 * @param {Object|Function} bf before fileter, bf(msg, session, next)
 * @memberOf Application
 */
Application.globalBefore = function (bf) {
    addFilter(this, Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
};

/**
 * Add global after filter.
 *
 * @param {Object|Function} af after filter, `af(err, msg, session, resp, next)`
 * @memberOf Application
 */
Application.globalAfter = function (af) {
    addFilter(this, Constants.KEYWORDS.GLOBAL_AFTER_FILTER, af);
};

/**
 * Add rpc before filter.
 *
 * @param {Object|Function} bf before fileter, bf(serverId, msg, opts, next)
 * @memberOf Application
 */
Application.rpcBefore = function (bf) {
    addFilter(this, Constants.KEYWORDS.RPC_BEFORE_FILTER, bf);
};

/**
 * Add rpc after filter.
 *
 * @param {Object|Function} af after filter, `af(serverId, msg, opts, next)`
 * @memberOf Application
 */
Application.rpcAfter = function (af) {
    addFilter(this, Constants.KEYWORDS.RPC_AFTER_FILTER, af);
};

/**
 * add a rpc filter to before and after rpc filter
 *
 * @param {Object} filter provide before and after filter method.
 *                        A filter should have two methods: before and after.
 * @memberOf Application
 */
Application.rpcFilter = function (filter) {
    this.rpcBefore(filter);
    this.rpcAfter(filter);
};

/**
 * Load component
 *
 * @param  {String} name    (optional) name of the component
 * @param  {Object} component component instance or factory function of the component
 * @param  {[type]} opts    (optional) construct parameters for the factory function
 * @return {Object}     app instance for chain invoke
 * @memberOf Application
 */
Application.load = function (name, component, opts) {
    let fnName = '';
    if (typeof name !== 'string') {
        opts = component;
        component = name;
        name = null;
        if (typeof component.name === 'string') {
            name = component.name;
            fnName = name;
        }
    }

    if (typeof component === 'function') {
        component = component(this, opts);
        if (fnName && component.name && fnName !== component.name) {
            name = component.name;
        }
    }

    if (!name && typeof component.name === 'string') {
        name = component.name;
    }

    if (name && this.components[name]) {
        // ignore duplicate component
        logger.warn('ignore duplicate component: %j', name);
        return;
    }

    this.loaded.push(component);
    if (name) {
        // components with a name would get by name throught app.components later.
        this.components[name] = component;
    }

    return this;
};

/**
 * Load Configure json file to settings.(support different enviroment directory & compatible for old path)
 *
 * @param {String} key environment key
 * @param {String} val environment value
 * @param {Boolean} reload whether reload after change default false
 * @return {Server|Mixed} for chaining, or the setting value
 * @memberOf Application
 */
Application.loadConfigBaseApp = function (key, val, reload) {
    const env = this.get(Constants.RESERVED.ENV);
    const originPath = path.join(Application.getBase(), val);
    const presentPath = path.join(Application.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(val));
    let realPath;
    if (fs.existsSync(originPath)) {
        realPath = originPath;
        const file = require(originPath);
        let config = file;
        if (file[env]) {
            config = file[env];
        }
        this.set(key, config);
    } else if (fs.existsSync(presentPath)) {
        realPath = presentPath;
        const pfile = require(presentPath);
        this.set(key, pfile);
    } else {
        logger.error('invalid configuration with file path: %s', key);
    }

    if (!!realPath && !!reload) {
        fs.watch(realPath, event => {
            if (event === 'change') {
                delete require.cache[require.resolve(realPath)];
                this.loadConfigBaseApp(key, val);
            }
        });
    }
};

/**
 * Load Configure json file to settings.
 *
 * @param {String} key environment key
 * @param {String} val environment value
 * @return {Server|Mixed} for chaining, or the setting value
 * @memberOf Application
 */
Application.loadConfig = function (key, val) {
    const env = this.get(Constants.RESERVED.ENV);
    let config = require(val);
    if (config[env]) {
        config = config[env];
    }
    this.set(key, config);
};

/**
 * Set the route function for the specified server type.
 *
 * Examples:
 *
 *  app.route('area', routeFunc);
 *
 *  let routeFunc = function(session, msg, app, cb) {
 *    // all request to area would be route to the first area server
 *    let areas = app.getServersByType('area');
 *    cb(null, areas[0].id);
 *  };
 *
 * @param  {String} serverType server type string
 * @param  {Function} routeFunc  route function. routeFunc(session, msg, app, cb)
 * @return {Object}     current application instance for chain invoking
 * @memberOf Application
 */
Application.route = function (serverType, routeFunc) {
    let routes = this.get(Constants.KEYWORDS.ROUTE);
    if (!routes) {
        routes = {};
        this.set(Constants.KEYWORDS.ROUTE, routes);
    }
    routes[serverType] = routeFunc;
    return this;
};

/**
 * Start application. It would load the default components and start all the loaded components.
 *
 * @param  {Function} cb callback function
 * @memberOf Application
 */
Application.start = function (cb) {
    this.startTime = Date.now();
    if (this.state > STATE_INITED) {
        utils.invokeCallback(cb, new Error('application has already start.'));
        return;
    }
    appUtil.startByType(this, () => {
        appUtil.loadDefaultComponents(this);
        const startUp = () => {
            appUtil.optComponents(this.loaded, Constants.RESERVED.START, err => {
                this.state = STATE_START;
                if (err) {
                    utils.invokeCallback(cb, err);
                } else {
                    logger.info('%j enter after start...', this.getServerId());
                    this.afterStart(cb);
                }
            });
        };
        const beforeFun = this.lifecycleCbs[Constants.LIFECYCLE.BEFORE_STARTUP];
        if (beforeFun) {
            beforeFun.call(null, this, startUp);
        } else {
            startUp();
        }
    });
};

/**
 * Lifecycle callback for after start.
 *
 * @param  {Function} cb callback function
 * @return {Void}
 */
Application.afterStart = function (cb) {
    if (this.state !== STATE_START) {
        utils.invokeCallback(cb, new Error('application is not running now.'));
        return;
    }

    const afterFun = this.lifecycleCbs[Constants.LIFECYCLE.AFTER_STARTUP];
    appUtil.optComponents(this.loaded, Constants.RESERVED.AFTER_START, err => {
        this.state = STATE_STARTED;
        const id = this.getServerId();
        if (!err) {
            logger.info('%j finish start', id);
        }
        if (afterFun) {
            afterFun.call(null, this, () => {
                utils.invokeCallback(cb, err);
            });
        } else {
            utils.invokeCallback(cb, err);
        }
        const usedTime = Date.now() - this.startTime;
        logger.info('%j startup in %s ms', id, usedTime);
        this.event.emit(events.START_SERVER, id);
    });
};

/**
 * Stop components.
 *
 * @param  {Boolean} force whether stop the app immediately
 */
Application.stop = function (force) {
    if (this.state > STATE_STARTED) {
        logger.warn('[pofresh application] application is not running now.');
        return;
    }
    this.state = STATE_STOPED;

    this.stopTimer = setTimeout(() => {
        process.exit(0);
    }, Constants.TIME.TIME_WAIT_STOP);

    const cancelShutDownTimer = () => {
        if (this.stopTimer) {
            clearTimeout(this.stopTimer);
        }
    };
    const shutDown = () => {
        appUtil.stopComps(this.loaded, 0, force, () => {
            cancelShutDownTimer();
            if (force) {
                process.exit(0);
            }
        });
    };
    const stopFun = this.lifecycleCbs[Constants.LIFECYCLE.BEFORE_SHUTDOWN];
    if (stopFun) {
        stopFun.call(null, this, shutDown, cancelShutDownTimer);
    } else {
        shutDown();
    }
};

/**
 * Configure callback for the specified env and server type.
 * When no env is specified that callback will
 * be invoked for all environments and when no type is specified
 * that callback will be invoked for all server types.
 *
 * Examples:
 *
 *  app.configure(function(){
 *    // executed for all envs and server types
 *  });
 *
 *  app.configure('development', function(){
 *    // executed development env
 *  });
 *
 *  app.configure('development', 'connector', function(){
 *    // executed for development env and connector server type
 *  });
 *
 * @return {Application} for chaining
 * @memberOf Application
 * @param args
 */
Application.configure = function (...args) {
    const callback = args.pop();
    let currentEnv = Constants.RESERVED.ALL;
    let currentType = Constants.RESERVED.ALL;

    if (args.length > 0) {
        currentEnv = args[0];
    }
    if (args.length > 1) {
        currentType = args[1];
    }

    if (
        (currentEnv === Constants.RESERVED.ALL || containsValue(this.settings.env, currentEnv)) &&
        (currentType === Constants.RESERVED.ALL || containsValue(this.settings.serverType, currentType))
    ) {
        callback.call(this);
    }
    return this;
};

/**
 * Register admin modules. Admin modules is the extends point of the monitor system.
 *
 * @param {String} module (optional) module id or provoided by module.moduleId
 * @param {Object} module module object or factory function for module
 * @param {Object} opts construct parameter for module
 * @memberOf Application
 */
Application.registerAdmin = function (moduleId, module, opts) {
    let modules = this.get(Constants.KEYWORDS.MODULE);
    if (!modules) {
        modules = {};
        this.set(Constants.KEYWORDS.MODULE, modules);
    }

    let currentModuleId = moduleId;
    let currentModule = module;
    let currentOpts = opts;

    if (typeof moduleId !== 'string') {
        currentOpts = module;
        currentModule = moduleId;
        if (currentModule) {
            currentModuleId = currentModule.moduleId;
        }
    }

    if (!currentModuleId) {
        return;
    }

    modules[currentModuleId] = {
        moduleId: currentModuleId,
        module: currentModule,
        opts: currentOpts
    };
};

/**
 * Use plugin.
 *
 * @param  {Object} plugin plugin instance
 * @param  {[type]} opts    (optional) construct parameters for the factory function
 * @memberOf Application
 */
Application.use = function (plugin, opts = {}) {
    if (!plugin.components) {
        logger.error('invalid components, no components exist');
        return;
    }

    const dir = path.dirname(plugin.components);

    if (!fs.existsSync(plugin.components)) {
        logger.error('fail to find components, find path: %s', plugin.components);
        return;
    }

    for (const filename of fs.readdirSync(plugin.components)) {
        if (!JS_FILE_REGEX.test(filename)) {
            continue;
        }
        const name = path.basename(filename, '.js');
        const param = opts[name] || {};
        const absolutePath = path.join(dir, Constants.DIR.COMPONENT, filename);
        if (fs.existsSync(absolutePath)) {
            this.load(require(absolutePath), param);
        } else {
            logger.error('component %s not exist at %s', name, absolutePath);
        }
    }

    // load events
    if (plugin.events) {
        if (!fs.existsSync(plugin.events)) {
            logger.error('fail to find events, find path: %s', plugin.events);
            return;
        }

        for (const filename of fs.readdirSync(plugin.events)) {
            if (!JS_FILE_REGEX.test(filename)) {
                continue;
            }
            const absolutePath = path.join(dir, Constants.DIR.EVENT, filename);
            if (fs.existsSync(absolutePath)) {
                bindEvents(require(absolutePath), this);
            } else {
                logger.error('events %s not exist at %s', filename, absolutePath);
            }
        }
    } else {
        return;
    }
};

/**
 * Application transaction. Transcation includes conditions and handlers, if conditions are satisfied, handlers would be executed.
 * And you can set retry times to execute handlers. The transaction log is in file logs/transaction.log.
 *
 * @param {String} name transaction name
 * @param {Object} conditions functions which are called before transaction
 * @param {Object} handlers functions which are called during transaction
 * @param {Number} retry retry times to execute handlers if conditions are successfully executed
 * @memberOf Application
 */
Application.transaction = (name, conditions, handlers, retry) => {
    appManager.transaction(name, conditions, handlers, retry);
};

/**
 * Get master server info.
 *
 * @return {Object} master server info, {id, host, port}
 * @memberOf Application
 */
Application.getMaster = function () {
    return this.master;
};

/**
 * Get current server info.
 *
 * @return {Object} current server info, {id, serverType, host, port}
 * @memberOf Application
 */
Application.getCurServer = function () {
    return this.curServer;
};

/**
 * Get current server id.
 *
 * @return {String|Number} current server id from servers.json
 * @memberOf Application
 */
Application.getServerId = function () {
    return this.serverId;
};

/**
 * Get current server type.
 *
 * @return {String|Number} current server type from servers.json
 * @memberOf Application
 */
Application.getServerType = function () {
    return this.serverType;
};

/**
 * Get all the current server infos.
 *
 * @return {Object} server info map, key: server id, value: server info
 * @memberOf Application
 */
Application.getServers = function () {
    return this.servers;
};

/**
 * Get all server infos from servers.json.
 *
 * @return {Object} server info map, key: server id, value: server info
 * @memberOf Application
 */
Application.getServersFromConfig = function () {
    return this.get(Constants.KEYWORDS.SERVER_MAP);
};

/**
 * Get all the server type.
 *
 * @return {Array} server type list
 * @memberOf Application
 */
Application.getServerTypes = function () {
    return this.serverTypes;
};

/**
 * Get server info by server id from current server cluster.
 *
 * @param  {String} serverId server id
 * @return {Object} server info or undefined
 * @memberOf Application
 */
Application.getServerById = function (serverId) {
    return this.servers[serverId];
};

/**
 * Get server info by server id from servers.json.
 *
 * @param  {String} serverId server id
 * @return {Object} server info or undefined
 * @memberOf Application
 */

Application.getServerFromConfig = function (serverId) {
    return this.get(Constants.KEYWORDS.SERVER_MAP)[serverId];
};

/**
 * Get server infos by server type.
 *
 * @param  {String} serverType server type
 * @return {Array}      server info list
 * @memberOf Application
 */
Application.getServersByType = function (serverType) {
    return this.serverTypeMaps[serverType];
};

/**
 * Check the server whether is a frontend server
 *
 * @param  {server}  server server info. it would check current server
 *            if server not specified
 * @return {Boolean}
 *
 * @memberOf Application
 */
Application.isFrontend = function (server) {
    const currentServer = server || this.getCurServer();
    return !!currentServer && currentServer.frontend === 'true';
};

/**
 * Check the server whether is a backend server
 *
 * @param  {server}  server server info. it would check current server
 *            if server not specified
 * @return {Boolean}
 * @memberOf Application
 */
Application.isBackend = function (server) {
    const currentServer = server || this.getCurServer();
    return !!currentServer && !currentServer.frontend;
};

/**
 * Check whether current server is a master server
 *
 * @return {Boolean}
 * @memberOf Application
 */
Application.isMaster = function () {
    return this.serverType === Constants.RESERVED.MASTER;
};

/**
 * Add new server info to current application in runtime.
 *
 * @param {Array} servers new server info list
 * @memberOf Application
 */
Application.addServers = function (servers) {
    if (!servers?.length) {
        return;
    }

    let _item, _slist;
    // 使用现代数组方法优化循环
    for (const server of servers) {
        // update global server map
        this.servers[server.id] = server;

        // update global server type map
        let slist = this.serverTypeMaps[server.serverType];
        if (!slist) {
            this.serverTypeMaps[server.serverType] = slist = [];
        }
        replaceServer(slist, server);

        // update global server type list
        if (!this.serverTypes.includes(server.serverType)) {
            this.serverTypes.push(server.serverType);
        }
    }
    this.event.emit(events.ADD_SERVERS, servers);
};

/**
 * Remove server info from current application at runtime.
 *
 * @param  {Array} ids server id list
 * @memberOf Application
 */
Application.removeServers = function (ids) {
    if (!ids?.length) {
        return;
    }

    // 使用现代数组方法优化循环
    for (const id of ids) {
        const item = this.servers[id];
        if (!item) {
            continue;
        }

        // clean global server map
        delete this.servers[id];

        // clean global server type map
        removeServer(this.serverTypeMaps[item.serverType], id);
    }
    this.event.emit(events.REMOVE_SERVERS, ids);
};

/**
 * Replace server info from current application at runtime.
 *
 * @param  {Object} server id map
 * @memberOf Application
 */
Application.replaceServers = function (servers) {
    if (!servers) {
        return;
    }

    this.servers = servers;
    this.serverTypeMaps = {};
    this.serverTypes = [];
    const serverArray = [];
    for (const id in servers) {
        if (!Object.hasOwn(servers, id)) {
            continue;
        }
        const server = servers[id];
        const serverType = server[Constants.RESERVED.SERVER_TYPE];
        let slist = this.serverTypeMaps[serverType];
        if (!slist) {
            this.serverTypeMaps[serverType] = slist = [];
        }
        this.serverTypeMaps[serverType].push(server);
        // update global server type list
        if (this.serverTypes.indexOf(serverType) < 0) {
            this.serverTypes.push(serverType);
        }
        serverArray.push(server);
    }
    this.event.emit(events.REPLACE_SERVERS, serverArray);
};

/**
 * Add crons from current application at runtime.
 *
 * @param  {Array} crons new crons would be added in application
 * @memberOf Application
 */
Application.addCrons = function (crons) {
    if (!crons?.length) {
        logger.warn('crons is not defined.');
        return;
    }
    this.event.emit(events.ADD_CRONS, crons);
};

/**
 * Remove crons from current application at runtime.
 *
 * @param  {Array} crons old crons would be removed in application
 * @memberOf Application
 */
Application.removeCrons = function (crons) {
    if (!crons?.length) {
        logger.warn('ids is not defined.');
        return;
    }
    this.event.emit(events.REMOVE_CRONS, crons);
};

function replaceServer(slist, serverInfo) {
    const existingIndex = slist.findIndex(s => s.id === serverInfo.id);
    if (existingIndex !== -1) {
        slist[existingIndex] = serverInfo;
    } else {
        slist.push(serverInfo);
    }
}

function removeServer(slist, id) {
    if (!slist?.length) {
        return;
    }

    const index = slist.findIndex(s => s.id === id);
    if (index !== -1) {
        slist.splice(index, 1);
    }
}

function containsValue(str, settings) {
    if (!settings) {
        return false;
    }

    const ts = settings.split('|');
    for (let i = 0, l = ts.length; i < l; i++) {
        if (str === ts[i]) {
            return true;
        }
    }
    return false;
}

function bindEvents(Event, app) {
    const emethods = new Event(app);
    for (const m in emethods) {
        if (typeof emethods[m] === 'function') {
            app.event.on(m, emethods[m].bind(emethods));
        }
    }
}

function addFilter(app, type, filter) {
    let filters = app.get(type);
    if (!filters) {
        filters = [];
        app.set(type, filters);
    }
    filters.push(filter);
}

module.exports = Application;
