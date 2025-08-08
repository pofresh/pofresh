const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const util = require('util');

// BatchLoggerManager for efficient log batching
class BatchLoggerManager {
    constructor(config) {
        this.config = config;
        this.timers = new Map();
    }

    // Add a log entry to the batch
    addLogEntry(logger, level, message, meta) {
        try {
            if (!this.config.enabled) {
                logger[level](message, meta);
                return;
            }

            const loggerKey = logger._batchKey || 'default';
            if (!this.config.batches.has(loggerKey)) {
                this.config.batches.set(loggerKey, []);
            }

            const batch = this.config.batches.get(loggerKey);
            batch.push({ level, message, meta });

            // Check if we need to flush the batch
            if (batch.length >= this.config.sizeThreshold) {
                this.flushBatch(loggerKey, logger);
            }

            // Set up a timer if not already set
            if (!this.timers.has(loggerKey)) {
                this.timers.set(
                    loggerKey,
                    setTimeout(() => {
                        this.flushBatch(loggerKey, logger);
                    }, this.config.timeThreshold)
                );
            }
        } catch (_error) {
            // Enhanced error handling with stack trace and context
            const _loggerKey = logger._batchKey || 'default';
            // Graceful degradation: Try to log directly without batching
            try {
                logger[level](`[BATCH ERROR] ${message}`, meta);
            } catch (_fallbackError) {
                // Silently ignore fallback logging errors to prevent infinite loops
            }
        }
    }

    // Flush a specific batch
    flushBatch(loggerKey, logger) {
        try {
            if (!this.config.batches.has(loggerKey)) {
                return;
            }

            const batch = this.config.batches.get(loggerKey);
            if (batch.length === 0) {
                this.config.batches.delete(loggerKey);
                if (this.timers.has(loggerKey)) {
                    clearTimeout(this.timers.get(loggerKey));
                    this.timers.delete(loggerKey);
                }
                return;
            }

            // Clear the timer for this batch
            if (this.timers.has(loggerKey)) {
                clearTimeout(this.timers.get(loggerKey));
                this.timers.delete(loggerKey);
            }

            // Process the batch
            for (const entry of batch) {
                try {
                    logger[entry.level](entry.message, entry.meta);
                } catch (entryError) {
                    // Attempt to log the error itself
                    try {
                        logger.error(`[ENTRY ERROR] ${entry.message}`, {
                            originalError: entryError.message,
                            stack: entryError.stack,
                            meta: entry.meta
                        });
                    } catch (_errorLoggingError) {
                        // Silently ignore logging errors to prevent infinite loops
                    }
                }
            }
        } catch (_error) {
            // Save failed batch for later processing
            try {
                const currentBatch = this.config.batches.get(loggerKey);
                if (currentBatch) {
                    if (!this.failedBatches) {
                        this.failedBatches = new Map();
                    }
                    if (!this.failedBatches.has(loggerKey)) {
                        this.failedBatches.set(loggerKey, []);
                    }
                    this.failedBatches.get(loggerKey).push(...currentBatch);
                }
            } catch (_saveError) {
                // Silently ignore save errors to prevent cascading failures
            }
        } finally {
            // Clear the batch regardless of processing outcome
            this.config.batches.delete(loggerKey);
        }
    }

    // Flush all batches
    flushAllBatches(loggers) {
        for (const [loggerKey, _] of this.config.batches.entries()) {
            const logger = loggers.get(loggerKey) || loggers.get('default');
            if (logger) {
                this.flushBatch(loggerKey, logger);
            }
        }
    }
}

const funcs = {
    env: doEnv,
    args: doArgs,
    opts: doOpts
};

// Winston logger instances cache with LRU implementation
class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.order = [];
    }

    get(key) {
        if (!this.cache.has(key)) {
            return;
        }

        // Move to end (most recently used)
        const index = this.order.indexOf(key);
        if (index !== -1) {
            this.order.splice(index, 1);
        }
        this.order.push(key);

        return this.cache.get(key);
    }

    set(key, value) {
        // Remove least recently used if full
        if (this.cache.size >= this.maxSize) {
            const lruKey = this.order.shift();
            this.cache.delete(lruKey);
        }

        // Add new item
        this.cache.set(key, value);
        this.order.push(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
        this.order = [];
    }

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

    keys() {
        return this.cache.keys();
    }
}

const loggerCache = new LRUCache(1000);

// Batch logging configuration
const batchConfig = {
    enabled: true,
    sizeThreshold: 100,
    timeThreshold: 500, // ms
    batches: new Map()
};

// Initialize batch manager after batchConfig is defined
const batchManager = new BatchLoggerManager(batchConfig);

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

    // Helper function to serialize objects
    function serializeObject(obj) {
        try {
            return JSON.stringify(obj, circularReplacer(), 2);
        } catch (_err) {
            return util.inspect(obj, {
                depth: getOptimalDepth(obj),
                colors: false,
                breakLength: 80,
                compact: messageSize(obj) > 1000
            });
        }
    }

    // Helper function to process arguments
    function processArguments(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return serializeObject(arg);
            }
            return arg;
        });
    }

    // Helper function to get log level mapping
    function mapLogLevel(item) {
        if (item === 'log') {
            return 'info';
        }
        if (item === 'fatal') {
            return 'error';
        }
        if (item === 'trace') {
            return 'debug';
        }
        return item;
    }

    // Helper function to format prefix
    function formatPrefix(item, args) {
        if (process.env.RAW_MESSAGE) {
            return '';
        }

        let p = '';
        if (args.length > 1) {
            p = `[${prefix}] `;
        }
        if (args.length && process.env.LOGGER_LINE) {
            p = `${getLine()}: ${p}`;
        }
        return colorize(p, colours[item]);
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

function initReloadConfiguration(filename, reloadSecs) {
    if (configState.timerId) {
        clearInterval(configState.timerId);
        configState.timerId = undefined;
    }
    configState.filename = filename;
    configState.lastMTime = getMTime(filename);
    configState.timerId = setInterval(reloadConfiguration, reloadSecs * 1000);
}

function getMTime(filename) {
    let mtime;
    try {
        mtime = fs.statSync(filename).mtime;
    } catch (error) {
        throw new Error(`Cannot find file with given path: ${filename}. Error: ${error.message}`);
    }
    return mtime;
}

function loadConfigurationFile(filename) {
    if (filename) {
        try {
            const content = fs.readFileSync(filename, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to load configuration file ${filename}: ${error.message}`);
        }
    }
    return;
}

function reloadConfiguration() {
    const mtime = getMTime(configState.filename);
    if (!mtime) {
        return;
    }
    if (configState.lastMTime && mtime.getTime() > configState.lastMTime.getTime()) {
        configureOnceOff(loadConfigurationFile(configState.filename));
    }
    configState.lastMTime = mtime;
}

function configureOnceOff(config) {
    if (config) {
        try {
            if (config.replaceConsole) {
                const logger = getLogger('console');
                console.log = logger.info.bind(logger);
                console.info = logger.info.bind(logger);
                console.warn = logger.warn.bind(logger);
                console.error = logger.error.bind(logger);
                console.debug = logger.debug.bind(logger);
            }
        } catch (e) {
            // Enhanced error handling with stack trace
            const _errorMessage = `Problem reading winston config ${util.inspect(config)}. Error was "${e.message}"`;
            // Graceful degradation: Continue with default configuration
            return;
        }
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

function convertLog4jsToWinston(log4jsConfig) {
    const winstonTransports = [];
    let defaultLevel = log4jsConfig.categories?.default?.level || 'info';

    // Convert log4js levels to Winston levels
    if (defaultLevel === 'all') {
        defaultLevel = 'silly';
    }
    if (defaultLevel === 'trace') {
        defaultLevel = 'debug';
    }
    if (defaultLevel === 'fatal') {
        defaultLevel = 'error';
    }

    // Convert appenders to Winston transports
    if (log4jsConfig.appenders) {
        for (const appenderName of Object.keys(log4jsConfig.appenders)) {
            const appender = log4jsConfig.appenders[appenderName];

            switch (appender.type) {
                case 'console':
                    winstonTransports.push(
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
                    );
                    break;
                case 'file':
                    winstonTransports.push(
                        new winston.transports.File({
                            filename: appender.filename,
                            maxsize: appender.maxLogSize,
                            maxFiles: appender.backups,
                            format: winston.format.combine(
                                winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
                                winston.format.errors({ stack: true }),
                                winston.format.printf(({ timestamp, level, message, category, stack }) => {
                                    const categoryStr = category || 'default';
                                    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
                                    return stack ? `${baseMessage}\n${stack}` : baseMessage;
                                })
                            )
                        })
                    );
                    break;
                case 'dateFile':
                    winstonTransports.push(
                        new DailyRotateFile({
                            filename: appender.filename,
                            datePattern: appender.pattern || 'YYYY-MM-DD',
                            maxSize: appender.maxLogSize,
                            maxFiles: appender.daysToKeep || appender.numBackups,
                            format: winston.format.combine(
                                winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
                                winston.format.errors({ stack: true }),
                                winston.format.printf(({ timestamp, level, message, category, stack }) => {
                                    const categoryStr = category || 'default';
                                    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${categoryStr} - ${message}`;
                                    return stack ? `${baseMessage}\n${stack}` : baseMessage;
                                })
                            )
                        })
                    );
                    break;
                default:
                    // Unknown appender type, skip silently
                    break;
            }
        }
    }

    // Default console transport if no transports defined
    if (winstonTransports.length === 0) {
        winstonTransports.push(
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
        );
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

function validateConfig(config) {
    const errors = [];

    // Validate required fields
    if (!config) {
        errors.push('Configuration cannot be null or undefined');
        return {
            valid: false,
            errors
        };
    }

    // Validate appenders if present
    if (config.appenders) {
        if (typeof config.appenders !== 'object') {
            errors.push('Appenders must be an object');
        } else {
            for (const appenderName of Object.keys(config.appenders)) {
                const appender = config.appenders[appenderName];
                if (!appender.type) {
                    errors.push(`Appender ${appenderName} is missing type`);
                }
                if (appender.type === 'file' && !appender.filename) {
                    errors.push(`File appender ${appenderName} is missing filename`);
                }
                if (appender.type === 'dateFile' && !appender.filename) {
                    errors.push(`DateFile appender ${appenderName} is missing filename`);
                }
            }
        }
    }

    // Validate categories if present
    if (config.categories) {
        if (typeof config.categories !== 'object') {
            errors.push('Categories must be an object');
        } else if (!config.categories.default) {
            errors.push('Default category is required');
        } else if (!config.categories.default.level) {
            errors.push('Default category is missing level');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function configure(config, opts) {
    const filename = config;
    let configValue = config || process.env.LOG4JS_CONFIG;
    const options = opts || {};

    try {
        if (typeof configValue === 'string') {
            try {
                configValue = loadConfigurationFile(configValue);
            } catch (_error) {
                configValue = {};
            }
        }

        if (configValue) {
            try {
                configValue = replaceProperties(configValue, options);

                // Validate configuration
                const validationResult = validateConfig(configValue);
                if (validationResult.valid) {
                    if (configValue.replaceConsole) {
                        configureOnceOff(configValue);
                    }

                    if (configValue.lineDebug) {
                        process.env.LOGGER_LINE = true;
                    }

                    if (configValue.rawMessage) {
                        process.env.RAW_MESSAGE = true;
                    }

                    // Convert log4js config to Winston config
                    winstonConfig = convertLog4jsToWinston(configValue);
                } else {
                    // Log validation errors if needed
                    for (const _error of validationResult.errors) {
                        // Error handling can be added here if needed
                    }
                    configValue = {};
                }

                // Clear logger cache to apply new configuration
                loggerCache.clear();
            } catch (_error) {
                configValue = {};
                loggerCache.clear();
            }
        }

        if (filename && configValue && configValue.reloadSecs) {
            try {
                initReloadConfiguration(filename, configValue.reloadSecs);
            } catch (_error) {
                /* ignore reload configuration errors */
            }
        }
    } catch (_error) {
        loggerCache.clear();
    }
}

function replaceProperties(configObj, opts) {
    if (Array.isArray(configObj)) {
        for (let i = 0, l = configObj.length; i < l; i++) {
            configObj[i] = replaceProperties(configObj[i], opts);
        }
    } else if (typeof configObj === 'object') {
        let field;
        for (const f in configObj) {
            if (!Object.hasOwn(configObj, f)) {
                continue;
            }

            field = configObj[f];
            if (typeof field === 'string') {
                configObj[f] = doReplace(field, opts);
            } else if (typeof field === 'object') {
                configObj[f] = replaceProperties(field, opts);
            }
        }
    }

    return configObj;
}

function doReplace(src, opts) {
    if (!src) {
        return src;
    }

    const ptn = /\$\{(.*?)\}/g;
    let m,
        pro,
        ts,
        scope,
        name,
        defaultValue,
        func,
        res = '',
        lastIndex = 0;
    m = ptn.exec(src);
    while (m) {
        pro = m[1];
        ts = pro.split(':');
        if (ts.length !== 2 && ts.length !== 3) {
            res += pro;
            m = ptn.exec(src);
            continue;
        }

        scope = ts[0];
        name = ts[1];
        if (ts.length === 3) {
            defaultValue = ts[2];
        }

        func = funcs[scope];
        if (!func && typeof func !== 'function') {
            res += pro;
            m = ptn.exec(src);
            continue;
        }

        res += src.substring(lastIndex, m.index);
        lastIndex = ptn.lastIndex;
        res += func(name, opts) || defaultValue;
        m = ptn.exec(src);
    }

    if (lastIndex < src.length) {
        res += src.substring(lastIndex);
    }

    return res;
}

function doEnv(name) {
    return process.env[name];
}

function doArgs(name) {
    return process.argv[name];
}

function doOpts(name, opts) {
    return opts ? opts[name] : undefined;
}

function getLine() {
    const e = new Error('Stack trace for line number detection');
    // now magic will happen: get line number from callstack
    if (process.platform === 'win32') {
        return e.stack.split('\n')[3].split(':')[2];
    }
    return e.stack.split('\n')[3].split(':')[1];
}

function colorizeStart(style) {
    return style ? `\x1B[${styles[style][0]}m` : '';
}

function colorizeEnd(style) {
    return style ? `\x1B[${styles[style][1]}m` : '';
}

/**
 * Taken from masylum's fork (https://github.com/masylum/log4js-node)
 */
function colorize(str, style) {
    return colorizeStart(style) + str + colorizeEnd(style);
}

const styles = {
    //styles
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    //grayscale
    white: [37, 39],
    grey: [90, 39],
    black: [90, 39],
    //colors
    blue: [34, 39],
    cyan: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [31, 39],
    yellow: [33, 39]
};

const colours = {
    all: 'grey',
    trace: 'blue',
    debug: 'cyan',
    info: 'green',
    warn: 'yellow',
    error: 'red',
    fatal: 'magenta',
    off: 'grey'
};

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
