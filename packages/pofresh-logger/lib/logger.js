const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const util = require('util');

// 导入重构后的模块
const BatchLoggerManager = require('./BatchLoggerManager');
const SerializationUtils = require('./utils/serializationUtils');
const ColorUtils = require('./utils/colorUtils');
const ConfigUtils = require('./utils/configUtils');

// 批量日志配置 - 将在configure函数中更新
let batchConfig = {
    enabled: true,
    sizeThreshold: 100,
    timeThreshold: 500, // ms,
    batches: new Map()
};

// 初始化批量管理器
let batchManager = new BatchLoggerManager(batchConfig);

// 导出配置用于测试
module.exports.batchConfig = batchConfig;

const funcs = {
    env: doEnv,
    args: doArgs,
    opts: doOpts
};

/**
 * 高性能LRU缓存实现
 */
class LRUCache {
    /**
     * 构造函数
     * @param {number} maxSize - 最大缓存大小
     */
    constructor(maxSize = 1000) {
        this.maxSize = Math.max(maxSize, 1);
        this.cache = new Map();
        this.order = [];
    }

    /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @returns {*} 缓存值
     */
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // 移动到末尾（最近使用）
        this.moveToEnd(key);
        return this.cache.get(key);
    }

    /**
     * 设置缓存值
     * @param {string} key - 缓存键
     * @param {*} value - 缓存值
     */
    set(key, value) {
        if (this.cache.has(key)) {
            // 更新现有值
            this.cache.set(key, value);
            this.moveToEnd(key);
        } else {
            // 添加新值
            if (this.cache.size >= this.maxSize) {
                this.evictLeastRecentlyUsed();
            }
            this.cache.set(key, value);
            this.order.push(key);
        }
    }

    /**
     * 检查是否包含键
     * @param {string} key - 缓存键
     * @returns {boolean} 是否包含
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
        this.order = [];
    }

    /**
     * 删除缓存
     * @param {string} key - 缓存键
     * @returns {boolean} 是否删除成功
     */
    delete(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            const index = this.order.indexOf(key);
            if (index !== -1) {
                this.order.splice(index, 1);
            }
            return true;
        }
        return false;
    }

    /**
     * 获取所有键
     * @returns {IterableIterator<string>} 键迭代器
     */
    keys() {
        return this.cache.keys();
    }

    /**
     * 移动键到末尾
     * @param {string} key - 缓存键
     * @private
     */
    moveToEnd(key) {
        const index = this.order.indexOf(key);
        if (index !== -1) {
            this.order.splice(index, 1);
        }
        this.order.push(key);
    }

    /**
     * 删除最少使用的项
     * @private
     */
    evictLeastRecentlyUsed() {
        if (this.order.length > 0) {
            const lruKey = this.order.shift();
            this.cache.delete(lruKey);
        }
    }

    /**
     * 获取缓存大小
     * @returns {number} 缓存大小
     */
    size() {
        return this.cache.size;
    }
}

const loggerCache = new LRUCache(1000);

// Export batchConfig for testing purposes
module.exports.batchConfig = batchConfig;

// Default Winston configuration
let winstonConfig = {
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, category, stack }) => {
            const categoryStr = category || 'default';
            const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
            return stack ? `${baseMessage}\n${stack}` : baseMessage;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, category, stack }) => {
                    const categoryStr = category || 'default';
                    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
                    const logLine = stack ? `${baseMessage}\n${stack}` : baseMessage;
                    const levelColor = colours[level.toLowerCase()] || colours.info;
                    return colorize(logLine, levelColor);
                })
            )
        })
    ]
};

function getLogger(categoryName, ...additionalArgs) {
    let prefix = '';
    for (let i = 0; i < additionalArgs.length; i++) {
        if (i !== additionalArgs.length - 1) {
            prefix = `${prefix + additionalArgs[i]}] [`;
        } else {
            prefix += additionalArgs[i];
        }
    }
    let processedCategoryName = categoryName;
    if (typeof categoryName === 'string') {
        // category name is __filename then cut the prefix path
        processedCategoryName = categoryName.replace(process.cwd(), '');
    }

    const cacheKey = `${processedCategoryName}|${prefix}`;
    if (loggerCache.has(cacheKey)) {
        return loggerCache.get(cacheKey);
    }

    // LRU cache automatically handles size limits

    const logger = winston.createLogger({
        ...winstonConfig,
        defaultMeta: { category: processedCategoryName }
    });

    const pLogger = {};

    // Copy winston logger properties
    for (const key in logger) {
        if (typeof logger[key] === 'function') {
            pLogger[key] = logger[key].bind(logger);
        } else {
            pLogger[key] = logger[key];
        }
    }

    // 使用SerializationUtils替换原有的辅助函数
    const serializeObject = SerializationUtils.serializeObject.bind(SerializationUtils);
    const processArguments = SerializationUtils.processArguments.bind(SerializationUtils);
    const mapLogLevel = SerializationUtils.mapLogLevel.bind(SerializationUtils);

    // Helper function to format prefix
    function formatPrefix(level, args) {
        if (process.env.RAW_MESSAGE) {
            return '';
        }

        let prefix = '';
        if (args.length > 1) {
            prefix = `[${args.join('] [')}] `;
        }
        if (args.length && process.env.LOGGER_LINE) {
            prefix = `${getLine()}: ${prefix}`;
        }
        return ColorUtils.colorize(prefix, ColorUtils.getLevelColor(level));
    }

    // Create log methods for each level
    const logLevels = ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'];
    for (const item of logLevels) {
        pLogger[item] = (...logArgs) => {
            const p = formatPrefix(item, additionalArgs);
            let message = logArgs[0] || '';

            // Enhanced object serialization with circular reference detection
            if (typeof message === 'object' && message !== null) {
                message = serializeObject(message);
            }

            if (additionalArgs.length) {
                message = p + message;
            }

            const level = mapLogLevel(item);
            const restArgs = logArgs.slice(1);
            const processedArgs = processArguments(restArgs);

            // Combine message with additional arguments
            if (processedArgs.length > 0) {
                message += ` ${processedArgs.join(' ')}`;
            }

            // Use batch manager to handle log entries
            batchManager.addLogEntry(logger, level, message, {
                category: categoryName
            });
        };
    }

    loggerCache.set(cacheKey, pLogger);
    return pLogger;
}

const configState = {};

/**
 * 初始化配置文件重载
 * @param {string} filename - 配置文件路径
 * @param {number} reloadSecs - 重载间隔（秒）
 */
function initReloadConfiguration(filename, reloadSecs) {
    if (configState.timerId) {
        clearInterval(configState.timerId);
        configState.timerId = undefined;
    }

    try {
        configState.filename = ConfigUtils.getAbsolutePath(filename);
        configState.lastMTime = ConfigUtils.getMTime(configState.filename);
        
        configState.timerId = setInterval(reloadConfiguration, reloadSecs * 1000);
    } catch (error) {
        console.error(`Failed to initialize reload configuration: ${error.message}`);
    }
}

/**
 * 重新加载配置
 */
function reloadConfiguration() {
    try {
        const mtime = ConfigUtils.getMTime(configState.filename);
        if (!mtime) {
            return;
        }

        if (configState.lastMTime && mtime.getTime() > configState.lastMTime.getTime()) {
            const config = ConfigUtils.loadConfigurationFile(configState.filename);
            configureOnceOff(config);
        }
        configState.lastMTime = mtime;
    } catch (error) {
        console.error(`Configuration reload failed: ${error.message}`);
    }
}

/**
 * 单次配置
 * @param {Object} config - 配置对象
 */
function configureOnceOff(config) {
    if (!config) {
        return;
    }

    try {
        if (config.replaceConsole) {
            const logger = getLogger('console');
            console.log = logger.info.bind(logger);
            console.info = logger.info.bind(logger);
            console.warn = logger.warn.bind(logger);
            console.error = logger.error.bind(logger);
            console.debug = logger.debug.bind(logger);
        }
    } catch (error) {
        console.error(`Problem reading winston config: ${error.message}`);
    }
}

/**
 * Configure the logger.
 * Configure file just like log4js.json. And support ${scope:arg-name} format property setting.
 * It can replace the placeholder in runtime.
 * scope can be:
 *     env: environment letiables, such as: env:PATH
 *     args: command line arguments, such as: args:1
 *     opts: key/value from opts argument of configure function
 *
 * @param  {String|Object} config configure file name or configure object
 * @param  {Object} opts   options
 * @return {Void}
 */

/**
 * 将log4js配置转换为Winston配置
 * @param {Object} log4jsConfig - log4js配置对象
 * @returns {Object} Winston配置对象
 */
function convertLog4jsToWinston(log4jsConfig) {
    const winstonTransports = [];
    let defaultLevel = log4jsConfig.categories?.default?.level || 'info';

    // 映射log4js级别到Winston级别
    const levelMap = {
        'all': 'silly',
        'trace': 'debug',
        'fatal': 'error'
    };
    defaultLevel = levelMap[defaultLevel] || defaultLevel;

    // 转换appenders到Winston传输器
    if (log4jsConfig.appenders) {
        for (const appenderName of Object.keys(log4jsConfig.appenders)) {
            const appender = log4jsConfig.appenders[appenderName];
            const transport = createWinstonTransport(appender);
            if (transport) {
                winstonTransports.push(transport);
            }
        }
    }

    // 如果没有定义传输器，添加默认的控制台传输器
    if (winstonTransports.length === 0) {
        winstonTransports.push(createDefaultConsoleTransport());
    }

    return {
        level: defaultLevel,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level: logLevel, message, category }) => {
                return `${timestamp} [${logLevel.toUpperCase()}] ${category ? `[${category}] ` : ''}${message}`;
            })
        ),
        transports: winstonTransports
    };
}

/**
 * 创建Winston传输器
 * @param {Object} appender - log4js appender配置
 * @returns {Object|null} Winston传输器
 */
function createWinstonTransport(appender) {
    const baseFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(getLogFormatFunction())
    );

    switch (appender.type) {
        case 'console':
            return new winston.transports.Console({
                format: winston.format.combine(
                    baseFormat,
                    winston.format.printf(getColoredLogFormatFunction())
                )
            });
        case 'file':
            return new winston.transports.File({
                filename: appender.filename,
                maxsize: appender.maxLogSize,
                maxFiles: appender.backups,
                format: baseFormat
            });
        case 'dateFile':
            return new DailyRotateFile({
                filename: appender.filename,
                datePattern: appender.pattern || 'YYYY-MM-DD',
                maxSize: appender.maxLogSize,
                maxFiles: appender.daysToKeep || appender.numBackups,
                format: baseFormat
            });
        default:
            return null;
    }
}

/**
 * 创建默认的控制台传输器
 * @returns {Object} Winston控制台传输器
 */
function createDefaultConsoleTransport() {
    return new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(getColoredLogFormatFunction())
        )
    });
}

/**
 * 获取日志格式化函数
 * @returns {function} 格式化函数
 */
function getLogFormatFunction() {
    return ({ timestamp, level, message, category, stack }) => {
        const categoryStr = category || 'default';
        const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
        return stack ? `${baseMessage}\n${stack}` : baseMessage;
    };
}

/**
 * 获取彩色日志格式化函数
 * @returns {function} 格式化函数
 */
function getColoredLogFormatFunction() {
    return ({ timestamp, level, message, category, stack }) => {
        const categoryStr = category || 'default';
        const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
        const logLine = stack ? `${baseMessage}\n${stack}` : baseMessage;
        const levelColor = ColorUtils.getLevelColor(level);
        return ColorUtils.colorize(logLine, levelColor);
    };
}

/**
 * 验证日志配置
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
 */
function validateConfig(config) {
    return ConfigUtils.validateConfig(config);
}

/**
 * 配置日志系统
 * @param {string|Object} config - 配置文件名或配置对象
 * @param {Object} opts - 选项对象
 */
function configure(config, opts) {
    const filename = config;
    let configValue = config || process.env.LOG4JS_CONFIG;
    const options = opts || {};

    try {
        if (typeof configValue === 'string') {
            try {
                configValue = ConfigUtils.loadConfigurationFile(configValue);
            } catch (error) {
                console.error(`Failed to load logger configuration: ${error.message}`);
                configValue = {};
            }
        }

        if (configValue) {
            try {
                // 替换配置属性
                configValue = ConfigUtils.replaceProperties(configValue, options);

                // 验证配置
                const validationResult = validateConfig(configValue);
                if (validationResult.valid) {
                    // 应用配置选项
                    applyConfigurationOptions(configValue);
                    
                    // 更新批处理配置
                    if (configValue.batch) {
                        batchConfig = { ...batchConfig, ...configValue.batch };
                        batchManager = new BatchLoggerManager(batchConfig);
                    }
                    
                    // 转换log4js配置为Winston配置
                    winstonConfig = convertLog4jsToWinston(configValue);
                } else {
                    console.error('Configuration validation failed:', validationResult.errors.join(', '));
                    configValue = {};
                }

                // 清空日志缓存以应用新配置
                loggerCache.clear();
            } catch (error) {
                console.error(`Failed to load logger configuration: ${error.message}`);
                configValue = {};
                loggerCache.clear();
            }
        }

        // 初始化配置重载
        if (filename && configValue && configValue.reloadSecs) {
            try {
                initReloadConfiguration(filename, configValue.reloadSecs);
            } catch (error) {
                console.error(`Failed to initialize reload configuration: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`Configuration setup failed: ${error.message}`);
        loggerCache.clear();
    }
}

/**
 * 应用配置选项
 * @param {Object} config - 配置对象
 */
function applyConfigurationOptions(config) {
    if (config.replaceConsole) {
        configureOnceOff(config);
    }

    if (config.lineDebug) {
        process.env.LOGGER_LINE = true;
    }

    if (config.rawMessage) {
        process.env.RAW_MESSAGE = true;
    }
}

// 向后兼容性函数
function doEnv(name) {
    return process.env[name];
}

function doArgs(name) {
    return process.argv[Number(name)];
}

function doOpts(name, opts) {
    return opts ? opts[name] : undefined;
}

// 这些函数现在由ConfigUtils处理
// 保留向后兼容性
function replaceProperties(configObj, opts) {
    return ConfigUtils.replaceProperties(configObj, opts);
}

function doReplace(src, opts) {
    return ConfigUtils.doReplace(src, opts);
}

// 这些函数现在由ColorUtils处理
// 保留向后兼容性
function colorize(str, style) {
    return ColorUtils.colorize(str, style);
}

function getLine() {
    const error = new Error('Stack trace for line number detection');
    const stack = error.stack;
    if (!stack) {
        return '';
    }

    try {
        const lines = stack.split('\n');
        if (lines.length < 4) {
            return '';
        }

        const thirdLine = lines[3];
        if (process.platform === 'win32') {
            return thirdLine.split(':')[2] || '';
        }
        return thirdLine.split(':')[1] || '';
    } catch {
        return '';
    }
}

// 保留向后兼容性的颜色映射
const colours = ColorUtils.levelColors;

// Winston compatible implementations
function shutdown(callback = null) {
    try {
        // Flush all remaining log batches
        batchManager.flushAllBatches(loggerCache);
    } catch (_error) {
        // Ignore flush errors during shutdown
    }

    // Clear all cached loggers
    loggerCache.clear();

    // Clear reload timer if exists
    if (configState.timerId) {
        clearInterval(configState.timerId);
        configState.timerId = undefined;
    }

    // Close all Winston transports
    if (winstonConfig?.transports) {
        const promises = winstonConfig.transports.map(transport => {
            return new Promise(resolve => {
                if (transport.close) {
                    // Add timeout to prevent hanging
                    const timeout = setTimeout(() => {
                        resolve();
                    }, 5000);

                    transport.close(() => {
                        clearTimeout(timeout);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });

        Promise.all(promises)
            .then(() => {
                if (callback) {
                    callback();
                }
            })
            .catch(error => {
                if (callback) {
                    callback(error);
                }
            });
    } else if (callback) {
        callback();
    }
}

function connectLogger(logger) {
    // Express middleware for logging HTTP requests
    return (req, res, next) => {
        const start = Date.now();
        const originalEnd = res.end;

        res.end = (...args) => {
            const duration = Date.now() - start;
            const logLevel = res.statusCode >= 400 ? 'error' : 'info';
            const message = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;

            if (logger?.[logLevel]) {
                logger[logLevel](message);
            }

            originalEnd.apply(res, args);
        };

        next();
    };
}

// Winston levels mapping
const levels = {
    ALL: { value: Number.MIN_VALUE, colour: 'grey' },
    TRACE: { value: 5000, colour: 'blue' },
    DEBUG: { value: 10_000, colour: 'cyan' },
    INFO: { value: 20_000, colour: 'green' },
    WARN: { value: 30_000, colour: 'yellow' },
    ERROR: { value: 40_000, colour: 'red' },
    FATAL: { value: 50_000, colour: 'magenta' },
    OFF: { value: Number.MAX_VALUE, colour: 'grey' }
};

function addLayout(name, layoutFunction) {
    // Winston uses formats instead of layouts
    // This is a compatibility function
    winston.format[name] = layoutFunction;
}

// Helper functions for serialization
function circularReplacer() {
    const seen = new WeakSet();
    return (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };
}

function messageSize(obj) {
    try {
        return Buffer.byteLength(JSON.stringify(obj));
    } catch {
        return 0;
    }
}

function getOptimalDepth(obj) {
    // Adjust inspection depth based on object complexity
    const size = messageSize(obj);
    if (size < 1000) {
        return 5; // Small objects get deeper inspection
    }
    if (size < 5000) {
        return 3; // Medium objects
    }
    return 1; // Large objects get shallow inspection
}

module.exports = {
    getLogger,
    configure,
    shutdown,
    connectLogger,
    batchConfig,
    levels,
    addLayout
};
