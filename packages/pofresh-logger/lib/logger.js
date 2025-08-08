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
        } catch (error) {
            // Enhanced error handling with stack trace and context
            const loggerKey = logger._batchKey || 'default';
            console.error(`Failed to add log entry for logger ${loggerKey}: ${error.message}`);
            console.error(error.stack);
            // Graceful degradation: Try to log directly without batching
            try {
                logger[level](`[BATCH ERROR] ${message}`, meta);
            } catch (fallbackError) {
                console.error(`Failed to fallback to direct logging: ${fallbackError.message}`);
            }
        }
    }

    // Flush a specific batch
    flushBatch(loggerKey, logger) {
        try {
            if (!this.config.batches.has(loggerKey)) return;

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
            batch.forEach(entry => {
                try {
                    logger[entry.level](entry.message, entry.meta);
                } catch (entryError) {
                    console.error(`Error logging entry in batch ${loggerKey}: ${entryError.message}`);
                    console.error(entryError.stack);
                    // Attempt to log the error itself
                    try {
                        logger.error(`[ENTRY ERROR] ${entry.message}`, {
                            originalError: entryError.message,
                            stack: entryError.stack,
                            meta: entry.meta
                        });
                    } catch (errorLoggingError) {
                        console.error(
                            `Failed to log error for entry in batch ${loggerKey}: ${errorLoggingError.message}`
                        );
                    }
                }
            });
        } catch (error) {
            console.error(`Error flushing batch ${loggerKey}: ${error.message}`);
            console.error(error.stack);
            // Save failed batch for later processing
            try {
                if (!this.failedBatches) {
                    this.failedBatches = new Map();
                }
                if (!this.failedBatches.has(loggerKey)) {
                    this.failedBatches.set(loggerKey, []);
                }
                this.failedBatches.get(loggerKey).push(...batch);
                console.warn(`Batch ${loggerKey} saved for later processing due to error`);
            } catch (saveError) {
                console.error(`Failed to save failed batch ${loggerKey}: ${saveError.message}`);
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
        if (!this.cache.has(key)) return;

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

function getLogger(categoryName) {
    const args = arguments;
    let prefix = '';
    for (let i = 1; i < args.length; i++) {
        if (i !== args.length - 1) {
            prefix = prefix + args[i] + '] [';
        } else {
            prefix = prefix + args[i];
        }
    }
    if (typeof categoryName === 'string') {
        // category name is __filename then cut the prefix path
        categoryName = categoryName.replace(process.cwd(), '');
    }

    const cacheKey = categoryName + '|' + prefix;
    if (loggerCache.has(cacheKey)) {
        return loggerCache.get(cacheKey);
    }

    // LRU cache automatically handles size limits

    const logger = winston.createLogger({
        ...winstonConfig,
        defaultMeta: { category: categoryName }
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

    ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(item => {
        pLogger[item] = () => {
            let p = '';
            if (!process.env.RAW_MESSAGE) {
                if (args.length > 1) {
                    p = '[' + prefix + '] ';
                }
                if (args.length && process.env.LOGGER_LINE) {
                    p = getLine() + ': ' + p;
                }

                p = colorize(p, colours[item]);
            }

            let message = arguments[0] || '';

            // Enhanced object serialization with circular reference detection
            if (typeof message === 'object' && message !== null) {
                try {
                    // Use custom replacer to handle circular references
                    message = JSON.stringify(message, circularReplacer(), 2);
                } catch (err) {
                    // Fallback to util.inspect with depth control
                    message = util.inspect(message, {
                        depth: getOptimalDepth(message),
                        colors: false,
                        breakLength: 80,
                        compact: messageSize(message) > 1000
                    });
                }
            }

            if (args.length) {
                message = p + message;
            }

            let level = item;
            if (item === 'log') level = 'info';
            if (item === 'fatal') level = 'error';
            if (item === 'trace') level = 'debug';

            const restArgs = Array.prototype.slice.call(arguments, 1);

            // Process additional arguments with enhanced serialization
            const processedArgs = restArgs.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg, circularReplacer(), 2);
                    } catch (err) {
                        return util.inspect(arg, {
                            depth: getOptimalDepth(arg),
                            colors: false,
                            breakLength: 80,
                            compact: messageSize(arg) > 1000
                        });
                    }
                }
                return arg;
            });

            // Combine message with additional arguments
            if (processedArgs.length > 0) {
                message += ' ' + processedArgs.join(' ');
            }

            // Use batch manager to handle log entries
            batchManager.addLogEntry(logger, level, message, {
                category: categoryName
            });
        };
    });

    loggerCache.set(cacheKey, pLogger);
    return pLogger;
}

const configState = {};

function initReloadConfiguration(filename, reloadSecs) {
    if (configState.timerId) {
        clearInterval(configState.timerId);
        delete configState.timerId;
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
            const errorMessage = `Problem reading winston config ${util.inspect(config)}. Error was "${e.message}"`;
            console.error(errorMessage);
            console.error(e.stack);
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
    let level = log4jsConfig.categories?.default?.level || 'info';

    // Convert log4js levels to Winston levels
    if (level === 'all') level = 'silly';
    if (level === 'trace') level = 'debug';
    if (level === 'fatal') level = 'error';

    // Convert appenders to Winston transports
    if (log4jsConfig.appenders) {
        Object.keys(log4jsConfig.appenders).forEach(appenderName => {
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
            }
        });
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
        level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, category }) => {
                return `${timestamp} [${level.toUpperCase()}] ${category ? `[${category}] ` : ''}${message}`;
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
            Object.keys(config.appenders).forEach(appenderName => {
                const appender = config.appenders[appenderName];
                if (!appender.type) {
                    errors.push('Appender ' + appenderName + ' is missing type');
                }
                if (appender.type === 'file' && !appender.filename) {
                    errors.push('File appender ' + appenderName + ' is missing filename');
                }
                if (appender.type === 'dateFile' && !appender.filename) {
                    errors.push('DateFile appender ' + appenderName + ' is missing filename');
                }
            });
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
    config = config || process.env.LOG4JS_CONFIG;
    opts = opts || {};

    try {
        if (typeof config === 'string') {
            try {
                config = loadConfigurationFile(config);
            } catch (error) {
                console.error('Failed to load logger configuration: ' + error.message);
                console.error(error.stack);
                // Use default configuration as fallback
                console.warn('Using default logger configuration as fallback');
                config = {};
            }
        }

        if (config) {
            try {
                config = replaceProperties(config, opts);

                // Validate configuration
                const validationResult = validateConfig(config);
                if (validationResult.valid) {
                    if (config.replaceConsole) {
                        configureOnceOff(config);
                    }

                    if (config.lineDebug) {
                        process.env.LOGGER_LINE = true;
                    }

                    if (config.rawMessage) {
                        process.env.RAW_MESSAGE = true;
                    }

                    // Convert log4js config to Winston config
                    winstonConfig = convertLog4jsToWinston(config);
                } else {
                    console.error('Invalid logger configuration:');
                    validationResult.errors.forEach(error => console.error('- ' + error));
                    // Use default configuration as fallback
                    console.warn('Using default logger configuration as fallback');
                    config = {};
                }

                // Clear logger cache to apply new configuration
                loggerCache.clear();
            } catch (error) {
                console.error('Failed to configure logger: ' + error.message);
                console.error(error.stack);
                // Use default configuration as fallback
                console.warn('Using default logger configuration as fallback');
                config = {};
                loggerCache.clear();
            }
        }

        if (filename && config && config.reloadSecs) {
            try {
                initReloadConfiguration(filename, config.reloadSecs);
            } catch (error) {
                console.error('Failed to initialize configuration reload: ' + error.message);
                console.error(error.stack);
            }
        }
    } catch (error) {
        console.error('Unexpected error in logger configuration: ' + error.message);
        console.error(error.stack);
        // Use default configuration as fallback
        console.warn('Using default logger configuration as fallback');
        loggerCache.clear();
    }
}

function replaceProperties(configObj, opts) {
    if (configObj instanceof Array) {
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
    while ((m = ptn.exec(src))) {
        pro = m[1];
        ts = pro.split(':');
        if (ts.length !== 2 && ts.length !== 3) {
            res += pro;
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
            continue;
        }

        res += src.substring(lastIndex, m.index);
        lastIndex = ptn.lastIndex;
        res += func(name, opts) || defaultValue;
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
    const e = new Error();
    // now magic will happen: get line number from callstack
    if (process.platform === 'win32') {
        return e.stack.split('\n')[3].split(':')[2];
    }
    return e.stack.split('\n')[3].split(':')[1];
}

function colorizeStart(style) {
    return style ? '\x1B[' + styles[style][0] + 'm' : '';
}

function colorizeEnd(style) {
    return style ? '\x1B[' + styles[style][1] + 'm' : '';
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
function shutdown(callback) {
    try {
        // Flush all remaining log batches
        batchManager.flushAllBatches(loggerCache);
    } catch (error) {
        console.error('Error flushing log batches during shutdown:', error);
    }

    // Clear all cached loggers
    loggerCache.clear();

    // Clear reload timer if exists
    if (configState.timerId) {
        clearInterval(configState.timerId);
        delete configState.timerId;
    }

    // Close all Winston transports
    if (winstonConfig && winstonConfig.transports) {
        const promises = winstonConfig.transports.map(transport => {
            return new Promise(resolve => {
                if (transport.close) {
                    // Add timeout to prevent hanging
                    const timeout = setTimeout(() => {
                        console.warn('Transport close timeout, forcing shutdown');
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
                if (callback) callback();
            })
            .catch(error => {
                console.error('Error during logger shutdown:', error.message);
                if (callback) callback(error);
            });
    } else if (callback) callback();
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

            if (logger && logger[logLevel]) {
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
    return (key, value) => {
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
    if (size < 1000) return 5; // Small objects get deeper inspection
    if (size < 5000) return 3; // Medium objects
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
