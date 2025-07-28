const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const util = require('util');

const funcs = {
    env: doEnv,
    args: doArgs,
    opts: doOpts
};

// Winston logger instances cache
const loggerCache = new Map();

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
    
    // Limit cache size to prevent memory leaks
    if (loggerCache.size > 1000) {
        const firstKey = loggerCache.keys().next().value;
        loggerCache.delete(firstKey);
    }

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

    ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(function (item) {
            pLogger[item] = function () {
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
                
                // Handle object serialization properly
                if (typeof message === 'object' && message !== null) {
                    try {
                        message = JSON.stringify(message, null, 2);
                    } catch (err) {
                        message = util.inspect(message, { depth: 3, colors: false });
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
                
                // Process additional arguments for better formatting
                const processedArgs = restArgs.map(arg => {
                    if (typeof arg === 'object' && arg !== null) {
                        try {
                            return JSON.stringify(arg, null, 2);
                        } catch (err) {
                            return util.inspect(arg, { depth: 3, colors: false });
                        }
                    }
                    return arg;
                });

                // Combine message with additional arguments
                if (processedArgs.length > 0) {
                    message += ' ' + processedArgs.join(' ');
                }

                if (logger[level] && typeof logger[level] === 'function') {
                    logger[level](message, { category: categoryName });
                } else {
                    // Fallback to info level if the level doesn't exist
                    logger.info(message, { category: categoryName });
                }
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
    return undefined;
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
            throw new Error(
                'Problem reading winston config ' +
                    util.inspect(config) +
                    '. Error was "' +
                    e.message +
                    '" (' +
                    e.stack +
                    ')'
            );
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
                winstonTransports.push(new winston.transports.Console({
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
                }));
                break;
            case 'file':
                winstonTransports.push(new winston.transports.File({
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
                }));
                break;
            case 'dateFile':
                winstonTransports.push(new DailyRotateFile({
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
                }));
                break;
            }
        });
    }

    // Default console transport if no transports defined
    if (winstonTransports.length === 0) {
        winstonTransports.push(new winston.transports.Console({
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
        }));
    }

    return {
        level: level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, category }) => {
                return `${timestamp} [${level.toUpperCase()}] ${category ? `[${category}] ` : ''}${message}`;
            })
        ),
        transports: winstonTransports
    };
}

function configure(config, opts) {
    const filename = config;
    config = config || process.env.LOG4JS_CONFIG;
    opts = opts || {};

    if (typeof config === 'string') {
        try {
            config = loadConfigurationFile(config);
        } catch (error) {
            console.error('Failed to load logger configuration:', error.message);
            return;
        }
    }

    if (config) {
        try {
            config = replaceProperties(config, opts);

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

            // Clear logger cache to apply new configuration
            loggerCache.clear();
        } catch (error) {
            console.error('Failed to configure logger:', error.message);
            return;
        }
    }

    if (filename && config && config.reloadSecs) {
        try {
            initReloadConfiguration(filename, config.reloadSecs);
        } catch (error) {
            console.error('Failed to initialize configuration reload:', error.message);
        }
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
            if (!Object.prototype.hasOwnProperty.call(configObj, f)) {
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
            return new Promise((resolve) => {
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
            .catch((error) => {
                console.error('Error during logger shutdown:', error.message);
                if (callback) callback(error);
            });
    } else {
        if (callback) callback();
    }
}

function connectLogger(logger) {
    // Express middleware for logging HTTP requests
    return function (req, res, next) {
        const start = Date.now();
        const originalEnd = res.end;

        res.end = function (...args) {
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
    DEBUG: { value: 10000, colour: 'cyan' },
    INFO: { value: 20000, colour: 'green' },
    WARN: { value: 30000, colour: 'yellow' },
    ERROR: { value: 40000, colour: 'red' },
    FATAL: { value: 50000, colour: 'magenta' },
    OFF: { value: Number.MAX_VALUE, colour: 'grey' }
};

function addLayout(name, layoutFunction) {
    // Winston uses formats instead of layouts
    // This is a compatibility function
    winston.format[name] = layoutFunction;
}

module.exports = {
    getLogger: getLogger,
    configure: configure,
    shutdown: shutdown,
    connectLogger: connectLogger,
    levels: levels,
    addLayout: addLayout
};
