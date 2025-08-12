/*!
 * pofresh -- proto
 * Copyright(c) 2020 ljhxai <ljhxai@163.com>
 * MIT Licensed
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

// 常量定义
const JS_FILE_REGEX = /\.js$/;

// 应用状态枚举
const AppState = {
    INITED: 1,   // 应用已初始化
    START: 2,    // 应用启动中
    STARTED: 3,  // 应用已启动
    STOPPED: 4   // 应用已停止
};

/**
 * Application 原型对象
 * 提供应用程序的核心功能和生命周期管理
 */
const Application = {};

/**
 * 初始化应用服务器
 * 设置默认配置和初始化各种属性
 * @param {Object} opts - 初始化选项
 * @param {string} opts.base - 应用基础路径
 */
Application.init = function (opts = {}) {
    // 组件管理
    this.loaded = [];        // 已加载的组件列表
    this.components = {};    // 组件名称到组件实例的映射
    this.settings = {};      // 应用设置存储
    
    // 设置基础路径
    const base = opts.base || path.dirname(require.main.filename);
    this.set(Constants.RESERVED.BASE, base, true);
    
    // 事件系统
    this.event = new EventEmitter();

    // 服务器信息初始化
    Object.assign(this, {
        serverId: null,
        serverType: null,
        curServer: null,
        startTime: null,
        master: null,
        servers: {},
        serverTypeMaps: {},
        serverTypes: [],
        lifecycleCbs: {},
        clusterSeq: {}
    });

    // 应用默认配置
    appUtil.defaultConfiguration(this);

    this.state = AppState.INITED;
    logger.info(`应用初始化完成: ${this.getServerId()}`);
};

/**
 * 获取应用基础路径
 * @return {string} 应用基础路径
 */
Application.getBase = function () {
    return this.get(Constants.RESERVED.BASE);
};

/**
 * 设置或获取应用配置
 * @param {string} setting - 配置键名
 * @param {*} val - 配置值（可选）
 * @param {boolean} attach - 是否将配置附加到应用实例上
 * @return {*} 链式调用返回this，获取时返回配置值
 * 
 * @example
 * app.set('key1', 'value1');
 * app.get('key1');  // 'value1'
 * 
 * app.set('key2', 'value2', true);
 * app.key2;         // 'value2'
 */
Application.set = function (setting, val, attach = false) {
    if (setting === undefined) return this;
    if (val === undefined) return this.settings[setting];

    this.settings[setting] = val;
    if (attach) this[setting] = val;
    
    return this;
};

/**
 * 获取应用配置
 * @param {string} setting - 配置键名
 * @return {*} 配置值
 */
Application.get = function (setting) {
    return this.settings[setting];
};

/**
 * 检查配置是否启用
 * @param {string} setting - 配置键名
 * @return {boolean} 是否启用
 */
Application.enabled = function (setting) {
    return !!this.get(setting);
};

/**
 * 检查配置是否禁用
 * @param {string} setting - 配置键名
 * @return {boolean} 是否禁用
 */
Application.disabled = function (setting) {
    return !this.get(setting);
};

/**
 * 启用配置
 * @param {string} setting - 配置键名
 * @return {Application} 链式调用
 */
Application.enable = function (setting) {
    return this.set(setting, true);
};

/**
 * 禁用配置
 * @param {string} setting - 配置键名
 * @return {Application} 链式调用
 */
Application.disable = function (setting) {
    return this.set(setting, false);
};

/**
 * 重写require方法，基于应用基础路径
 * @param {string} ph - 文件路径
 * @return {*} require的结果
 */
Application.require = ph => require(path.join(Application.getBase(), ph));

/**
 * 配置日志系统
 * @param {Object} jsLogger - pofresh-logger实例
 */
Application.configureLogger = function (jsLogger) {
    if (process.env.pofresh_LOGGER === 'off') return;
    
    const base = this.getBase();
    const env = this.get(Constants.RESERVED.ENV);
    const originPath = path.join(base, Constants.FILEPATH.LOG);
    const presentPath = path.join(base, Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.LOG));
    const loggerConfig = { serverId: this.serverId, base };

    if (fs.existsSync(originPath)) {
        jsLogger.configure(originPath, loggerConfig);
    } else if (fs.existsSync(presentPath)) {
        jsLogger.configure(presentPath, loggerConfig);
    } else {
        logger.error(`日志配置文件未找到: ${originPath} 或 ${presentPath}`);
    }
};

/**
 * 添加前置和后置过滤器
 * @param {Object} filter - 过滤器对象，应包含before和after方法
 */
Application.filter = function (filter) {
    this.before(filter);
    this.after(filter);
};

/**
 * 添加前置过滤器
 * @param {Object|Function} bf - 前置过滤器 bf(msg, session, next)
 */
Application.before = function (bf) {
    addFilter(this, Constants.KEYWORDS.BEFORE_FILTER, bf);
};

/**
 * 添加后置过滤器
 * @param {Object|Function} af - 后置过滤器 af(err, msg, session, resp, next)
 */
Application.after = function (af) {
    addFilter(this, Constants.KEYWORDS.AFTER_FILTER, af);
};

/**
 * 添加全局前置和后置过滤器
 * @param {Object} filter - 过滤器对象，应包含before和after方法
 */
Application.globalFilter = function (filter) {
    this.globalBefore(filter);
    this.globalAfter(filter);
};

/**
 * 添加全局前置过滤器
 * @param {Object|Function} bf - 全局前置过滤器 bf(msg, session, next)
 */
Application.globalBefore = function (bf) {
    addFilter(this, Constants.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
};

/**
 * 添加全局后置过滤器
 * @param {Object|Function} af - 全局后置过滤器 af(err, msg, session, resp, next)
 */
Application.globalAfter = function (af) {
    addFilter(this, Constants.KEYWORDS.GLOBAL_AFTER_FILTER, af);
};

/**
 * 添加RPC前置过滤器
 * @param {Object|Function} bf - RPC前置过滤器 bf(serverId, msg, opts, next)
 */
Application.rpcBefore = function (bf) {
    addFilter(this, Constants.KEYWORDS.RPC_BEFORE_FILTER, bf);
};

/**
 * 添加RPC后置过滤器
 * @param {Object|Function} af - RPC后置过滤器 af(serverId, msg, opts, next)
 */
Application.rpcAfter = function (af) {
    addFilter(this, Constants.KEYWORDS.RPC_AFTER_FILTER, af);
};

/**
 * 添加RPC前置和后置过滤器
 * @param {Object} filter - 过滤器对象，应包含before和after方法
 */
Application.rpcFilter = function (filter) {
    this.rpcBefore(filter);
    this.rpcAfter(filter);
};

/**
 * 加载组件
 * @param {string} name - 组件名称（可选）
 * @param {Object|Function} component - 组件实例或工厂函数
 * @param {Object} opts - 构造参数（可选）
 * @return {Application} 链式调用
 */
Application.load = function (name, component, opts) {
    // 参数重载处理
    if (typeof name !== 'string') {
        [opts, component, name] = [component, name, null];
        if (typeof component.name === 'string') {
            name = component.name;
        }
    }

    // 如果是工厂函数，则调用它
    if (typeof component === 'function') {
        component = component(this, opts);
    }

    // 尝试从组件对象获取名称
    if (!name && typeof component?.name === 'string') {
        name = component.name;
    }

    // 检查重复组件
    if (name && this.components[name]) {
        logger.warn(`忽略重复组件: ${name}`);
        return this;
    }

    // 添加到已加载列表
    this.loaded.push(component);
    
    // 如果有名称，添加到组件映射
    if (name) {
        this.components[name] = component;
    }

    return this;
};

/**
 * 加载配置文件到设置中（支持不同环境目录和旧路径兼容）
 * @param {string} key - 配置键名
 * @param {string} val - 配置文件路径
 * @param {boolean} reload - 是否监听文件变化自动重载
 */
Application.loadConfigBaseApp = function (key, val, reload = false) {
    const env = this.get(Constants.RESERVED.ENV);
    const originPath = path.join(Application.getBase(), val);
    const presentPath = path.join(Application.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(val));
    
    let realPath;
    let config;
    
    if (fs.existsSync(originPath)) {
        realPath = originPath;
        const file = require(originPath);
        config = file[env] || file;
        this.set(key, config);
    } else if (fs.existsSync(presentPath)) {
        realPath = presentPath;
        config = require(presentPath);
        this.set(key, config);
    } else {
        logger.error(`配置文件未找到: ${key} -> ${originPath} 或 ${presentPath}`);
        return;
    }

    // 设置文件监听
    if (realPath && reload) {
        fs.watch(realPath, event => {
            if (event === 'change') {
                delete require.cache[require.resolve(realPath)];
                this.loadConfigBaseApp(key, val);
                logger.info(`配置文件已重载: ${key}`);
            }
        });
    }
};

/**
 * 加载配置文件到设置中
 * @param {string} key - 配置键名
 * @param {string} val - 配置文件路径
 */
Application.loadConfig = function (key, val) {
    const env = this.get(Constants.RESERVED.ENV);
    const config = require(val);
    this.set(key, config[env] || config);
};

/**
 * 设置指定服务器类型的路由函数
 * @param {string} serverType - 服务器类型
 * @param {Function} routeFunc - 路由函数 routeFunc(session, msg, app, cb)
 * @return {Application} 链式调用
 * 
 * @example
 * app.route('area', (session, msg, app, cb) => {
 *   const areas = app.getServersByType('area');
 *   cb(null, areas[0].id);
 * });
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
 * 启动应用程序，加载默认组件并启动所有已加载的组件
 * @param {Function} cb - 回调函数
 */
Application.start = function (cb) {
    this.startTime = Date.now();
    
    if (this.state > AppState.INITED) {
        utils.invokeCallback(cb, new Error('应用程序已经启动'));
        return;
    }
    
    appUtil.startByType(this, () => {
        appUtil.loadDefaultComponents(this);
        
        const startUp = () => {
            appUtil.optComponents(this.loaded, Constants.RESERVED.START, err => {
                this.state = AppState.START;
                if (err) {
                    utils.invokeCallback(cb, err);
                } else {
                    logger.info(`${this.getServerId()} 进入启动后阶段...`);
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
 * 启动后的生命周期回调
 * @param {Function} cb - 回调函数
 */
Application.afterStart = function (cb) {
    if (this.state !== AppState.START) {
        utils.invokeCallback(cb, new Error('应用程序当前未运行'));
        return;
    }

    const afterFun = this.lifecycleCbs[Constants.LIFECYCLE.AFTER_STARTUP];
    
    appUtil.optComponents(this.loaded, Constants.RESERVED.AFTER_START, err => {
        this.state = AppState.STARTED;
        const id = this.getServerId();
        
        if (!err) {
            logger.info(`${id} 启动完成`);
        }
        
        if (afterFun) {
            afterFun.call(null, this, () => {
                utils.invokeCallback(cb, err);
            });
        } else {
            utils.invokeCallback(cb, err);
        }
        
        const usedTime = Date.now() - this.startTime;
        logger.info(`${id} 启动耗时 ${usedTime} ms`);
        this.event.emit(events.START_SERVER, id);
    });
};

/**
 * 停止组件
 * @param {boolean} force - 是否强制停止应用
 * @param {Function} cb - 回调函数
 */
Application.stop = function (force, cb) {
    if (this.state < AppState.STARTED) {
        utils.invokeCallback(cb, new Error('应用程序当前未运行'));
        return;
    }
    
    this.state = AppState.STOPED;

    // 设置超时强制退出
    this.stopTimer = setTimeout(() => {
        process.exit(1);
    }, Constants.TIME.TIME_WAIT_STOP);

    const shutDown = () => {
        appUtil.stopComps(this.loaded, 0, force, () => {
            if (this.stopTimer) {
                clearTimeout(this.stopTimer);
            }
            if (force) {
                process.exit(1);
            }
            utils.invokeCallback(cb);
        });
    };
    
    // 执行关闭钩子
    const shutDownHook = this.lifecycleCbs[Constants.LIFECYCLE.BEFORE_SHUTDOWN];
    const stopServiceHook = this.get(Constants.RESERVED.STOP_SERVICE_HOOK);
    
    if (shutDownHook) {
        shutDownHook.call(this, this, shutDown, shutDown);
    } else if (stopServiceHook) {
        stopServiceHook.call(this, this, shutDown, shutDown);
    } else {
        shutDown();
    }
};

/**
 * 配置指定环境和服务器类型的回调
 * @param {...*} args - 参数列表：[env], [type], callback
 * @return {Application} 链式调用
 * 
 * @example
 * app.configure(() => {
 *   // 所有环境和服务器类型都执行
 * });
 * 
 * app.configure('development', () => {
 *   // 仅开发环境执行
 * });
 * 
 * app.configure('development', 'connector', () => {
 *   // 开发环境的connector服务器类型执行
 * });
 */
Application.configure = function (...args) {
    const callback = args.pop();
    const [currentEnv = Constants.RESERVED.ALL, currentType = Constants.RESERVED.ALL] = args;

    const envMatch = currentEnv === Constants.RESERVED.ALL || containsValue(this.settings.env, currentEnv);
    const typeMatch = currentType === Constants.RESERVED.ALL || containsValue(this.settings.serverType, currentType);

    if (envMatch && typeMatch) {
        callback.call(this);
    }
    return this;
};

/**
 * 注册管理模块，管理模块是监控系统的扩展点
 * @param {string} moduleId - 模块ID（可选）
 * @param {Object|Function} module - 模块对象或工厂函数
 * @param {Object} opts - 构造参数
 */
Application.registerAdmin = function (moduleId, module, opts) {
    let modules = this.get(Constants.KEYWORDS.MODULE);
    if (!modules) {
        modules = {};
        this.set(Constants.KEYWORDS.MODULE, modules);
    }

    // 参数重载处理
    if (typeof moduleId !== 'string') {
        [opts, module, moduleId] = [module, moduleId, module?.moduleId];
    }

    if (!moduleId) {
        logger.warn('模块ID为空，跳过注册');
        return;
    }

    modules[moduleId] = {
        moduleId,
        module,
        opts
    };
    
    logger.info(`管理模块已注册: ${moduleId}`);
};

/**
 * 使用插件
 * @param {Object} plugin - 插件实例
 * @param {Object} opts - 构造参数（可选）
 */
Application.use = function (plugin, opts = {}) {
    if (!plugin.components) {
        logger.error('无效的组件配置，组件不存在');
        return;
    }

    // 加载组件
    this._loadPluginComponents(plugin.components, opts);
    
    // 加载事件
    if (plugin.events) {
        this._loadPluginEvents(plugin.events);
    }
};

/**
 * 加载插件组件
 * @private
 */
Application._loadPluginComponents = function (componentsPath, opts) {
    if (!fs.existsSync(componentsPath)) {
        logger.error(`组件路径不存在: ${componentsPath}`);
        return;
    }

    const dir = path.dirname(componentsPath);
    
    fs.readdirSync(componentsPath)
        .filter(filename => JS_FILE_REGEX.test(filename))
        .forEach(filename => {
            const name = path.basename(filename, '.js');
            const param = opts[name] || {};
            const absolutePath = path.join(dir, Constants.DIR.COMPONENT, filename);
            
            try {
                if (fs.existsSync(absolutePath)) {
                    this.load(require(absolutePath), param);
                    logger.debug(`组件已加载: ${name}`);
                } else {
                    logger.error(`组件不存在: ${name} at ${absolutePath}`);
                }
            } catch (err) {
                logger.error(`加载组件失败 ${name}: ${err.message}`);
            }
        });
};

/**
 * 加载插件事件
 * @private
 */
Application._loadPluginEvents = function (eventsPath) {
    if (!fs.existsSync(eventsPath)) {
        logger.error(`事件路径不存在: ${eventsPath}`);
        return;
    }

    const dir = path.dirname(eventsPath);
    
    fs.readdirSync(eventsPath)
        .filter(filename => JS_FILE_REGEX.test(filename))
        .forEach(filename => {
            const absolutePath = path.join(dir, Constants.DIR.EVENT, filename);
            
            try {
                if (fs.existsSync(absolutePath)) {
                    bindEvents(require(absolutePath), this);
                    logger.debug(`事件已绑定: ${filename}`);
                } else {
                    logger.error(`事件文件不存在: ${filename} at ${absolutePath}`);
                }
            } catch (err) {
                logger.error(`绑定事件失败 ${filename}: ${err.message}`);
            }
        });
};

/**
 * 事务处理，包含条件和处理器，如果条件满足则执行处理器
 * 可以设置重试次数来执行处理器，事务日志记录在 logs/transaction.log
 *
 * @param {string} name - 事务名称
 * @param {Object} conditions - 事务前调用的条件函数
 * @param {Object} handlers - 事务期间调用的处理器函数
 * @param {number} retry - 条件成功执行后处理器的重试次数
 */
Application.transaction = (name, conditions, handlers, retry) => {
    return appManager.transaction(name, conditions, handlers, retry);
};

/**
 * 获取主服务器信息
 * @return {Object} 主服务器信息 {id, host, port}
 */
Application.getMaster = function () {
    return this.master;
};

/**
 * 获取当前服务器信息
 * @return {Object} 当前服务器信息 {id, serverType, host, port}
 */
Application.getCurServer = function () {
    return this.curServer;
};

/**
 * 获取当前服务器ID
 * @return {string|number} 来自servers.json的当前服务器ID
 */
Application.getServerId = function () {
    return this.serverId;
};

/**
 * 获取当前服务器类型
 * @return {string} 来自servers.json的当前服务器类型
 */
Application.getServerType = function () {
    return this.serverType;
};

/**
 * 获取所有当前服务器信息
 * @return {Object} 服务器信息映射，键：服务器ID，值：服务器信息
 */
Application.getServers = function () {
    return this.servers;
};

/**
 * 从servers.json获取所有服务器信息
 * @return {Object} 服务器信息映射，键：服务器ID，值：服务器信息
 */
Application.getServersFromConfig = function () {
    return this.get(Constants.KEYWORDS.SERVER_MAP);
};

/**
 * 获取所有服务器类型
 * @return {Array} 服务器类型列表
 */
Application.getServerTypes = function () {
    return this.serverTypes;
};

/**
 * 根据服务器ID从当前服务器集群获取服务器信息
 * @param {string} serverId - 服务器ID
 * @return {Object|undefined} 服务器信息或undefined
 */
Application.getServerById = function (serverId) {
    return this.servers[serverId];
};

/**
 * 根据服务器ID从servers.json获取服务器信息
 * @param {string} serverId - 服务器ID
 * @return {Object|undefined} 服务器信息或undefined
 */
Application.getServerFromConfig = function (serverId) {
    return this.get(Constants.KEYWORDS.SERVER_MAP)[serverId];
};

/**
 * 根据服务器类型获取服务器信息列表
 * @param {string} serverType - 服务器类型
 * @return {Array} 服务器信息列表
 */
Application.getServersByType = function (serverType) {
    return this.serverTypeMaps[serverType] || [];
};

/**
 * 检查服务器是否为前端服务器
 * @param {Object} server - 服务器信息，未指定时检查当前服务器
 * @return {boolean} 是否为前端服务器
 */
Application.isFrontend = function (server) {
    const currentServer = server || this.getCurServer();
    return !!currentServer && currentServer.frontend === 'true';
};

/**
 * 检查服务器是否为后端服务器
 * @param {Object} server - 服务器信息，未指定时检查当前服务器
 * @return {boolean} 是否为后端服务器
 */
Application.isBackend = function (server) {
    const currentServer = server || this.getCurServer();
    return !!currentServer && !currentServer.frontend;
};

/**
 * 检查当前服务器是否为主服务器
 * @return {boolean} 是否为主服务器
 */
Application.isMaster = function () {
    return this.serverType === Constants.RESERVED.MASTER;
};

/**
 * 运行时向当前应用添加新服务器信息
 * @param {Array} servers - 新服务器信息列表
 */
Application.addServers = function (servers) {
    if (!servers?.length) {
        return;
    }

    // 使用现代数组方法优化循环
    for (const server of servers) {
        // 更新全局服务器映射
        this.servers[server.id] = server;

        // 更新全局服务器类型映射
        let slist = this.serverTypeMaps[server.serverType];
        if (!slist) {
            this.serverTypeMaps[server.serverType] = slist = [];
        }
        replaceServer(slist, server);

        // 更新全局服务器类型列表
        if (!this.serverTypes.includes(server.serverType)) {
            this.serverTypes.push(server.serverType);
        }
    }
    this.event.emit(events.ADD_SERVERS, servers);
};

/**
 * 运行时从当前应用移除服务器信息
 * @param {Array} ids - 服务器ID列表
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

        // 清理全局服务器映射
        delete this.servers[id];

        // 清理全局服务器类型映射
        removeServer(this.serverTypeMaps[item.serverType], id);
    }
    this.event.emit(events.REMOVE_SERVERS, ids);
};

/**
 * 运行时替换当前应用的服务器信息
 * @param {Object} servers - 服务器ID映射
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
        
        // 更新全局服务器类型列表
        if (!this.serverTypes.includes(serverType)) {
            this.serverTypes.push(serverType);
        }
        serverArray.push(server);
    }
    this.event.emit(events.REPLACE_SERVERS, serverArray);
};

/**
 * 运行时向当前应用添加定时任务
 * @param {Array} crons - 要添加的定时任务列表
 */
Application.addCrons = function (crons) {
    if (!crons?.length) {
        logger.warn('定时任务列表为空');
        return;
    }
    this.event.emit(events.ADD_CRONS, crons);
    logger.info(`已添加 ${crons.length} 个定时任务`);
};

/**
 * 运行时从当前应用移除定时任务
 * @param {Array} crons - 要移除的定时任务列表
 */
Application.removeCrons = function (crons) {
    if (!crons?.length) {
        logger.warn('定时任务列表为空');
        return;
    }
    this.event.emit(events.REMOVE_CRONS, crons);
    logger.info(`已移除 ${crons.length} 个定时任务`);
};

/**
 * 替换服务器列表中的服务器信息
 * @private
 */
function replaceServer(serverList, serverInfo) {
    const index = serverList.findIndex(server => server.id === serverInfo.id);
    if (index !== -1) {
        serverList[index] = serverInfo;
    } else {
        serverList.push(serverInfo);
    }
}

/**
 * 从服务器列表中移除指定服务器
 * @private
 */
function removeServer(serverList, id) {
    if (!serverList?.length) {
        return;
    }
    const index = serverList.findIndex(server => server.id === id);
    if (index !== -1) {
        serverList.splice(index, 1);
    }
}

/**
 * 检查字符串是否包含在设置中
 * @private
 */
function containsValue(str, settings) {
    if (!settings) {
        return false;
    }

    if (typeof settings === 'string') {
        return settings.split('|').includes(str);
    }

    if (Array.isArray(settings)) {
        return settings.includes(str);
    }

    return false;
}

/**
 * 绑定事件处理器
 * @private
 */
function bindEvents(EventClass, app) {
    const eventMethods = new EventClass(app);
    Object.keys(eventMethods).forEach(methodName => {
        if (typeof eventMethods[methodName] === 'function') {
            app.event.on(methodName, eventMethods[methodName].bind(eventMethods));
        }
    });
}

/**
 * 添加过滤器
 * @private
 */
function addFilter(app, type, filter) {
    let filters = app.get(type);
    if (!filters) {
        filters = [];
        app.set(type, filters);
    }
    filters.push(filter);
}

module.exports = Application;
