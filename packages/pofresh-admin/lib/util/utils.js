/**
 * pofresh-admin Utilities Module
 * Enhanced with modern error handling, security, and performance optimizations
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const rrl = require('reverse-read-line');
const ErrorHandler = require('./errorHandler');
const configManager = require('./configManager');
const Constants = require('./constants');

const utils = module.exports;

/**
 * Logger instance for utilities
 */
const getLogger = () => require('pofresh-logger').getLogger('pofresh-admin', 'utils');

/**
 * Check and invoke callback with enhanced error handling
 * @param {Function} cb - Callback function
 * @param {...*} args - Arguments to pass to callback
 */
utils.invokeCallback = (cb, ...args) => {
    if (!!cb && typeof cb === 'function') {
        try {
            cb.apply(null, args);
        } catch (err) {
            const logger = getLogger();
            logger.error('Error in callback execution:', err);
        }
    }
};

/**
 * Safe callback invocation using ErrorHandler
 * @param {Function} cb - Callback function
 * @param {Error} err - Error object
 * @param {*} result - Result data
 */
utils.safeCallback = (cb, err, result) => {
    ErrorHandler.safeCallback(cb, err, result);
};

/**
 * Create timeout callback wrapper
 * @param {Function} cb - Original callback
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} operation - Operation name for logging
 * @returns {Object} Timeout callback wrapper
 */
utils.createTimeoutCallback = (cb, timeout, operation) => {
    return ErrorHandler.createTimeoutCallback(cb, timeout, operation);
};

/**
 * Validate parameters with enhanced type checking
 * @param {Object} params - Parameters object
 * @param {Array} required - Required parameter names
 * @param {Object} types - Parameter type mappings
 * @returns {Error|null} Validation error or null
 */
utils.validateParams = (params, required = [], types = {}) => {
    return ErrorHandler.validateParams(params, required, types);
};

/**
 * Format date with enhanced pattern support
 * @param {Date} date - Date object to format
 * @param {string} format - Format pattern
 * @returns {string} Formatted date string
 */
utils.format = (date, format = 'MM-dd-hhmm') => {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
    }

    const o = {
        'M+': date.getMonth() + 1, // month
        'd+': date.getDate(), // day
        'h+': date.getHours(), // hour
        'm+': date.getMinutes(), // minute
        's+': date.getSeconds(), // second
        'q+': Math.floor((date.getMonth() + 3) / 3), // quarter
        'S+': date.getMilliseconds() // millisecond
    };

    // Year replacement
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, String(date.getFullYear()).substr(4 - RegExp.$1.length));
    }

    // Other patterns
    for (const k in o) {
        if (new RegExp(`(${k})`).test(format)) {
            const value = String(o[k]);
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? value : value.padStart(2, '0'));
        }
    }

    return format;
};

/**
 * Compare server configurations
 * @param {Object} server1 - First server configuration
 * @param {Object} server2 - Second server configuration
 * @returns {boolean} True if servers match
 */
utils.compareServer = (server1, server2) => {
    if (!server1 || !server2) return false;
    return server1.host === server2.host && server1.port === server2.port;
};

/**
 * Get the count of elements in object with filtering
 * @param {Object} obj - Object to count
 * @param {string} type - Optional type filter
 * @returns {number} Element count
 */
utils.size = (obj, type) => {
    if (!obj || typeof obj !== 'object') {
        return 0;
    }

    let count = 0;
    for (const key in obj) {
        if (Object.hasOwn(obj, key) && typeof obj[key] !== 'function') {
            if (!type) {
                count++;
            } else if (obj[key] && obj[key].type === type) {
                count++;
            }
        }
    }
    return count;
};

/**
 * Generate MD5 hash with input validation
 * @param {string} str - String to hash
 * @returns {string} MD5 hash
 */
utils.md5 = str => {
    if (!str || typeof str !== 'string') {
        throw new Error('Input must be a non-empty string');
    }

    const md5sum = crypto.createHash('md5');
    md5sum.update(str, 'utf8');
    return md5sum.digest('hex');
};

/**
 * Default user authentication with enhanced security
 * @param {Object} msg - Authentication message
 * @param {string} env - Environment name
 * @param {Function} cb - Callback function
 */
utils.defaultAuthUser = (msg, env, cb) => {
    // Validate parameters
    const validationError = ErrorHandler.validateParams(msg, ['username', 'password'], {
        username: 'string',
        password: 'string'
    });

    if (validationError) {
        return ErrorHandler.safeCallback(cb, validationError);
    }

    if (!env || typeof env !== 'string') {
        return ErrorHandler.safeCallback(cb, new Error('Environment must be a non-empty string'));
    }

    // Use safe async operation with ConfigManager
    ErrorHandler.safeAsyncOperation(
        () => {
            const adminUsers = configManager.loadAdminUsers(env);

            if (!adminUsers || !Array.isArray(adminUsers) || adminUsers.length === 0) {
                return null; // No configured users, return null
            }

            const { username, password, md5 } = msg;

            // Sanitize inputs
            const sanitizedUsername = String(username).trim();
            const sanitizedPassword = String(password);

            if (!sanitizedUsername || !sanitizedPassword) {
                return null;
            }

            const user = adminUsers.find(u => {
                if (!u || typeof u !== 'object' || u.username !== sanitizedUsername) {
                    return false;
                }

                const userPassword = String(u.password);
                return md5 ? utils.md5(userPassword) === sanitizedPassword : userPassword === sanitizedPassword;
            });

            // Return user without sensitive information
            if (user) {
                const { password, ...safeUser } = user;
                return safeUser;
            }

            return null;
        },
        cb,
        'User authentication'
    );
};

/**
 * Default server master authentication with enhanced security
 * @param {Object} msg - Authentication message
 * @param {string} env - Environment name
 * @param {Function} cb - Callback function
 */
utils.defaultAuthServerMaster = (msg, env, cb) => {
    try {
        const validationError = ErrorHandler.validateParams(msg, ['serverType', 'token'], {
            serverType: 'string',
            token: 'string'
        });

        if (validationError) {
            return ErrorHandler.safeCallback(cb, validationError);
        }

        const { serverType, token } = msg;

        // Master type is always allowed
        if (serverType === 'master') {
            return ErrorHandler.safeCallback(cb, null, 'ok');
        }

        // Load server configurations asynchronously but maintain callback interface
        utils
            .loadServerConfig(env)
            .then(servers => {
                if (!servers || !Array.isArray(servers) || servers.length === 0) {
                    return ErrorHandler.safeCallback(cb, null, 'ok');
                }

                // Find matching server (fallback to simple comparison for compatibility)
                const server = servers.find(s => s && s.type === serverType && s.token && s.token === token);

                ErrorHandler.safeCallback(cb, null, server ? 'ok' : 'bad');
            })
            .catch(err => {
                const logger = getLogger();
                logger.error('Server master authentication error:', err);
                ErrorHandler.safeCallback(cb, err);
            });
    } catch (err) {
        const logger = getLogger();
        logger.error('Server master authentication error:', err);
        ErrorHandler.safeCallback(cb, err);
    }
};

/**
 * Default server monitor authentication with enhanced security
 * @param {Object} msg - Authentication message
 * @param {string} env - Environment name
 * @param {Function} cb - Callback function
 */
utils.defaultAuthServerMonitor = (msg, env, cb) => {
    try {
        const validationError = ErrorHandler.validateParams(msg, ['serverType'], {
            serverType: 'string'
        });

        if (validationError) {
            return ErrorHandler.safeCallback(cb, validationError);
        }

        const { serverType } = msg;

        // Load server configurations asynchronously but maintain callback interface
        utils
            .loadServerConfig(env)
            .then(servers => {
                if (!servers || !Array.isArray(servers) || servers.length === 0) {
                    return ErrorHandler.safeCallback(cb, null, null);
                }

                // Find matching server
                const server = servers.find(s => s && s.type === serverType);
                ErrorHandler.safeCallback(cb, null, server ? server.token : null);
            })
            .catch(err => {
                const logger = getLogger();
                logger.error('Server monitor authentication error:', err);
                ErrorHandler.safeCallback(cb, err);
            });
    } catch (err) {
        const logger = getLogger();
        logger.error('Server monitor authentication error:', err);
        ErrorHandler.safeCallback(cb, err);
    }
};

/**
 * Load server configuration with error handling
 * @param {string} env - Environment name
 * @returns {Promise<Array>} Server configurations
 */
utils.loadServerConfig = async env => {
    try {
        const appBase = path.dirname(require.main.filename);
        const serverPath = path.join(appBase, 'config/adminServer.json');
        let envPath = null;

        if (env) {
            envPath = path.join(appBase, 'config', env, 'adminServer.json');
        }

        // Try environment-specific config first, then default
        let configPath = envPath;
        if (!fsSync.existsSync(configPath)) {
            configPath = serverPath;
        }

        if (!fsSync.existsSync(configPath)) {
            return null;
        }

        const configData = await fs.readFile(configPath, 'utf8');
        const config = ErrorHandler.safeJsonParse(configData, []);

        if (!Array.isArray(config)) {
            throw new Error('Server configuration must be an array');
        }

        return config;
    } catch (err) {
        const logger = getLogger();
        logger.error('Failed to load server configuration:', err);
        return null;
    }
};

/**
 * Tail file with enhanced error handling and validation
 * @param {string} filename - File path
 * @param {number} num - Number of lines to read
 * @returns {Promise<Array>} Array of lines
 */
utils.tail = async (filename, num = 10) => {
    if (!filename || typeof filename !== 'string') {
        throw new Error('Filename must be a non-empty string');
    }

    if (!ErrorHandler.isPathSafe(filename)) {
        throw new Error('Invalid file path');
    }

    if (typeof num !== 'number' || num <= 0) {
        throw new Error('Number of lines must be a positive number');
    }

    try {
        const reader = rrl.create(filename);
        await reader.open();
        const lines = await reader.readLines(num);
        await reader.close();
        return lines;
    } catch (err) {
        const logger = getLogger();
        logger.error(`Failed to tail file ${filename}:`, err);
        throw err;
    }
};
