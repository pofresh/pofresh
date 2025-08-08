const os = require('os');
const util = require('util');
const exec = require('child_process').exec;
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const Constants = require('./constants');
const pofresh = require('../pofresh');

const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = (cb, ...args) => {
    if (typeof cb === 'function') {
        cb(...args);
    }
};

/**
 * Get the count of elements of object
 */
utils.size = obj => {
    let count = 0;
    for (const i in obj) {
        if (Object.hasOwn(obj, i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
};

/**
 * Check a string whether ends with another string
 */
utils.endsWith = (str, suffix) => typeof str === 'string' && typeof suffix === 'string' && str.endsWith(suffix);

/**
 * Check a string whether starts with another string
 */
utils.startsWith = (str, prefix) => typeof str === 'string' && typeof prefix === 'string' && str.startsWith(prefix);

/**
 * Compare the two arrays and return the difference.
 */
utils.arrayDiff = (array1, array2) => {
    const set2 = new Set(array2);
    return array1.filter(item => !set2.has(item));
};

/**
 * Date format - optimized version using Intl.DateTimeFormat
 */
utils.format = (date, format = 'MMddhhmm') => {
    const pad = (n, len = 2) => n.toString().padStart(len, '0');
    const replacements = {
        yyyy: date.getFullYear(),
        MM: pad(date.getMonth() + 1),
        dd: pad(date.getDate()),
        hh: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
        SSS: pad(date.getMilliseconds(), 3),
        q: Math.ceil((date.getMonth() + 1) / 3)
    };

    return format.replace(/yyyy|MM|dd|hh|mm|ss|SSS|q/g, match => replacements[match]);
};

/**
 * check if has Chinese characters.
 */
utils.hasChineseChar = str => /[\u4e00-\u9fa5]/.test(str);

/**
 * transform unicode to utf8 - optimized version
 */
utils.unicodeToUtf8 = str => {
    try {
        // 使用现代浏览器内置的TextEncoder/TextDecoder
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str);
        }

        // 回退到原生方法
        return unescape(encodeURIComponent(str));
    } catch (e) {
        // 异常处理
        return str;
    }
};

/**
 * Ping server to check if network is available
 *
 */
utils.ping = (host, cb) => {
    if (utils.isLocal(host)) {
        cb(true);
    } else {
        const cmd = 'ping -w 15 ' + host;
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                cb(false);
                return;
            }
            cb(true);
        });
    }
};

/**
 * Check if server is exsit.
 *
 */
utils.checkPort = function (server, cb) {
    if (!(server.port || server.clientPort) || os.platform() === 'win32') {
        this.invokeCallback(cb, 'leisure');
        return;
    }

    const port = server.port || server.clientPort;
    const host = server.host;

    // 使用Node.js原生方式检查端口，避免命令注入
    const net = require('net');

    const checkPortInternal = (portToCheck, callback) => {
        if (!portToCheck) {
            callback('leisure');
            return;
        }

        // 验证端口范围为有效数字
        const portNum = Number.parseInt(portToCheck, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65_535) {
            logger.error('Invalid port number: %s', portToCheck);
            callback('error');
            return;
        }

        if (this.isLocal(host)) {
            // 本地端口检查 - 使用安全的TCP连接测试
            const socket = new net.Socket();
            const timeout = 2000;

            socket.setTimeout(timeout);
            socket.on('connect', () => {
                socket.destroy();
                callback('busy');
            });
            socket.on('timeout', () => {
                socket.destroy();
                callback('leisure');
            });
            socket.on('error', () => {
                socket.destroy();
                callback('leisure');
            });

            socket.connect(portNum, '127.0.0.1');
        } else {
            // 远程端口检查 - 使用安全的SSH连接
            const { spawn } = require('child_process');
            const sshParams = pofresh.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS) || [];

            // 验证SSH参数安全性 - 仅允许已知安全参数
            const validParams = sshParams.filter(param => typeof param === 'string' && /^[a-zA-Z0-9=-]+$/.test(param));

            const args = [...validParams, host, 'nc', '-z', host, portNum.toString()];

            try {
                const child = spawn('ssh', args, {
                    stdio: 'pipe',
                    timeout: 5000
                });

                let hasError = false;
                child.stderr.on('data', data => {
                    hasError = true;
                    logger.warn('SSH port check warning: %s', data.toString().trim());
                });

                child.on('close', code => {
                    if (hasError) {
                        callback('error');
                    } else if (code === 0) {
                        callback('busy');
                    } else {
                        callback('leisure');
                    }
                });

                child.on('error', err => {
                    logger.error('SSH port check error: %j', err.message);
                    callback('error');
                });
            } catch (err) {
                logger.error('Failed to spawn SSH process: %j', err.message);
                callback('error');
            }
        }
    };

    // 检查主要端口
    checkPortInternal(server.port, result1 => {
        if (result1 === 'busy') {
            this.invokeCallback(cb, 'busy');
        } else if (result1 === 'error') {
            this.invokeCallback(cb, 'error');
        } else {
            // 检查客户端端口
            checkPortInternal(server.clientPort, result2 => {
                this.invokeCallback(cb, result2);
            });
        }
    });
};

utils.isLocal = host => {
    const app = require('../pofresh').app;
    if (app) {
        return (
            host === '127.0.0.1' ||
            host === 'localhost' ||
            host === '0.0.0.0' ||
            inLocal(host) ||
            host === app.master.host
        );
    }
    return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
};

/**
 * Load cluster server.
 *
 */
utils.loadCluster = (app, server, serverMap) => {
    const increaseFields = {};
    const count = Number.parseInt(server[Constants.RESERVED.CLUSTER_COUNT]);
    let seq = app.clusterSeq[server.serverType];
    if (seq) {
        app.clusterSeq[server.serverType] = seq + count;
    } else {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    }

    for (const key in server) {
        const value = server[key].toString();
        if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0) {
            const base = server[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    const clone = src => {
        const rs = {};
        for (const key in src) {
            rs[key] = src[key];
        }
        return rs;
    };
    for (let i = 0, l = seq; i < count; i++, l++) {
        const cserver = clone(server);
        cserver.id = Constants.RESERVED.CLUSTER_PREFIX + server.serverType + '-' + l;
        for (const k in increaseFields) {
            const v = Number.parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
};

utils.extends = (origin, add) => (add && utils.isObject(add) ? { ...origin, ...add } : origin);

utils.headHandler = headBuffer => {
    // 使用位运算优化字节读取
    return (headBuffer.readUInt8(1) << 16) | (headBuffer.readUInt8(2) << 8) | headBuffer.readUInt8(3);
};

const localIps = Object.values(os.networkInterfaces())
    .flat()
    .filter(details => details.family === 'IPv4')
    .map(details => details.address);

const inLocal = host => localIps.includes(host);

utils.isObject = arg => arg !== null && typeof arg === 'object';
