const { execSync } = require('child_process');
const os = require('os');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const pofresh = require('../pofresh.js');
const Constants = require('./constants.js');

const LOG = logger;
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;
const SSH_PARAM_REGEX = /^[a-zA-Z0-9=-]+$/;
const DATE_FORMAT_REGEX = /yyyy|MM|dd|hh|mm|ss|SSS|q/g;

/**
 * General utility functions for the Pofresh framework
 * Provides common helper functions for callback handling, data manipulation,
 * networking, and system operations
 */

/**
 * Invoke callback with arguments, checking if callback is a function
 * @param {function} cb - Callback function
 * @param {...*} args - Arguments to pass to callback
 */
function invokeCallback(cb, ...args) {
    if (typeof cb === 'function') {
        if (isAsyncFunction(cb)) {
            cb(...args).then(() => Promise.resolve());
        } else {
            cb(...args);
        }
    }
}

/**
 * Get the count of own properties (excluding functions) in an object
 * @param {Object} obj - Object to count properties of
 * @returns {number} Count of properties
 */
function size(obj) {
    if (!obj || typeof obj !== 'object') {
        return 0;
    }

    let count = 0;
    for (const key in obj) {
        if (Object.hasOwn(obj, key) && typeof obj[key] !== 'function') {
            count++;
        }
    }
    return count;
}

/**
 * Compare two arrays and return the difference (elements in array1 not in array2)
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns {Array} Array of elements in array1 not in array2
 */
function arrayDiff(array1, array2) {
    if (!(Array.isArray(array1) && Array.isArray(array2))) {
        return [];
    }

    const set2 = new Set(array2);
    return array1.filter(item => !set2.has(item));
}

/**
 * Date formatting with support for various format strings
 * @param {Date|string|number} date - Date to format
 * @param {string} dateFormat - Format string (default: 'MMddhhmm')
 * @returns {string} Formatted date string
 */
function format(date, dateFormat = 'MMddhhmm') {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
        return '';
    }

    const pad = (n, len = 2) => n.toString().padStart(len, '0');
    const replacements = {
        yyyy: d.getFullYear(),
        MM: pad(d.getMonth() + 1),
        dd: pad(d.getDate()),
        hh: pad(d.getHours()),
        mm: pad(d.getMinutes()),
        ss: pad(d.getSeconds()),
        SSS: pad(d.getMilliseconds(), 3),
        q: Math.ceil((d.getMonth() + 1) / 3)
    };

    return dateFormat.replace(DATE_FORMAT_REGEX, match => replacements[match]);
}

/**
 * Check if a string contains Chinese characters
 * @param {string} str - String to check
 * @returns {boolean} True if string contains Chinese characters
 */
function hasChineseChar(str) {
    if (typeof str !== 'string') {
        return false;
    }
    return CHINESE_CHAR_REGEX.test(str);
}

/**
 * Convert unicode string to UTF-8 bytes
 * @param {string} str - String to convert
 * @returns {Uint8Array} UTF-8 encoded bytes
 */
function unicodeToUtf8(str) {
    try {
        // Use modern TextEncoder if available
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str);
        }

        // Fallback to native method
        return unescape(encodeURIComponent(str));
    } catch (_e) {
        return str;
    }
}

/**
 * Ping a server to check if network is available
 * @param {string} host - Host to ping
 */
async function ping(host) {
    if (isLocal(host)) {
        return true;
    }

    try {
        const cmd = `ping -w 15 ${host}`;
        execSync(cmd);
        return true;
    } catch (_error) {
        return false;
    }
}

/**
 * Check if a server port is available
 * @param {Object} server - Server configuration object
 */
async function checkPort(server) {
    if (!(server.port || server.clientPort) || os.platform() === 'win32') {
        return 'leisure';
    }

    const port = server.port || server.clientPort;
    const host = server.host;

    try {
        return await checkPortInternal(port, host);
    } catch (error) {
        return error;
    }
}

/**
 * Internal function to check port availability
 * @private
 */
async function checkPortInternal(port, host) {
    if (!port) {
        return 'leisure';
    }

    // Validate port range
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65_535) {
        LOG.error('Invalid port number: %s', port);
        throw new Error('Invalid port number');
    }

    if (isLocal(host)) {
        // Local port check - use TCP connection test
        const net = require('net');
        const timeout = 2000;

        const check = new Promise((resolve, _reject) => {
            const socket = new net.Socket();

            socket.setTimeout(timeout);
            socket.on('connect', () => {
                socket.destroy();
                resolve('busy');
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve('leisure');
            });
            socket.on('error', () => {
                socket.destroy();
                resolve('leisure');
            });

            socket.connect(portNum, '127.0.0.1');
        });

        return await check;
    }
    // Remote port check - use SSH connection
    const { spawn } = require('child_process');
    const sshParams = pofresh.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS) || [];

    // Validate SSH parameters for security
    const validParams = sshParams.filter(param => typeof param === 'string' && SSH_PARAM_REGEX.test(param));

    const args = [...validParams, host, 'nc', '-z', host, portNum.toString()];

    try {
        const child = spawn('ssh', args, {
            stdio: 'pipe',
            timeout: 5000
        });

        let hasError = false;
        child.stderr.on('data', data => {
            hasError = true;
            LOG.warn('SSH port check warning: %s', data.toString().trim());
        });

        const result = await new Promise((resolve, _reject) => {
            child.on('close', code => {
                if (hasError) {
                    _reject(new Error('SSH error'));
                } else if (code === 0) {
                    resolve('busy');
                } else {
                    resolve('leisure');
                }
            });

            child.on('error', err => {
                LOG.error('SSH port check error: %s', err.message);
                _reject(err);
            });
        });

        return result;
    } catch (err) {
        LOG.error('Failed to spawn SSH process: %s', err.message);
        throw err;
    }
}

/**
 * Check if a host is local
 * @param {string} host - Host to check
 * @returns {boolean} True if host is local
 */
function isLocal(host) {
    const localIps = Object.values(os.networkInterfaces())
        .flat()
        .filter(details => details.family === 'IPv4')
        .map(details => details.address);

    const app = pofresh.app;

    if (app) {
        return (
            host === '127.0.0.1' ||
            host === 'localhost' ||
            host === '0.0.0.0' ||
            localIps.includes(host) ||
            host === app.master.host
        );
    }

    return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || localIps.includes(host);
}

/**
 * Load cluster server configuration
 * @param {Object} app - Application instance
 * @param {Object} server - Server configuration
 * @param {Object} serverMap - Server map to populate
 */
function loadCluster(app, server, serverMap) {
    const increaseFields = {};
    const count = Number.parseInt(server[Constants.RESERVED.CLUSTER_COUNT], 10);
    let seq = app.clusterSeq?.[server.serverType] || 0;

    if (app.clusterSeq) {
        app.clusterSeq[server.serverType] = seq + count;
    } else {
        app.clusterSeq = { [server.serverType]: count };
    }

    // Find fields that need incrementing
    for (const key in server) {
        const value = server[key].toString();
        if (value.includes(Constants.RESERVED.CLUSTER_SIGNAL)) {
            const base = server[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    // Clone and create cluster servers
    const clone = src => {
        const rs = {};
        for (const key in src) {
            rs[key] = src[key];
        }
        return rs;
    };

    for (let i = 0; i < count; i++, seq++) {
        const cserver = clone(server);
        cserver.id = `${Constants.RESERVED.CLUSTER_PREFIX}${server.serverType}-${seq}`;

        // Apply incrementing values
        for (const k in increaseFields) {
            const v = Number.parseInt(increaseFields[k], 10);
            cserver[k] = v + i;
        }

        serverMap[cserver.id] = cserver;
    }
}

/**
 * Parse head buffer to extract header information
 * @param {Buffer} headBuffer - Head buffer
 * @returns {number} Parsed header value
 */
function headHandler(headBuffer) {
    // Use bit operations for optimized byte reading
    return (headBuffer.readUInt8(1) << 16) | (headBuffer.readUInt8(2) << 8) | headBuffer.readUInt8(3);
}

function isAsyncFunction(fn) {
    return fn?.constructor?.name === 'AsyncFunction';
}

module.exports = {
    invokeCallback,
    size,
    arrayDiff,
    format,
    hasChineseChar,
    unicodeToUtf8,
    ping,
    checkPort,
    isLocal,
    loadCluster,
    headHandler,
    isAsyncFunction
};
