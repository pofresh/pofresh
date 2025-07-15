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
utils.invokeCallback = function (cb) {
    if (typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * Get the count of elements of object
 */
utils.size = function (obj) {
    let count = 0;
    for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
};

/**
 * Check a string whether ends with another string
 */
utils.endsWith = function (str, suffix) {
    if (typeof str !== 'string' || typeof suffix !== 'string' || suffix.length > str.length) {
        return false;
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

/**
 * Check a string whether starts with another string
 */
utils.startsWith = function (str, prefix) {
    if (typeof str !== 'string' || typeof prefix !== 'string' || prefix.length > str.length) {
        return false;
    }

    return str.indexOf(prefix) === 0;
};

/**
 * Compare the two arrays and return the difference.
 */
utils.arrayDiff = function (array1, array2) {
    let o = {};
    for (let i = 0, len = array2.length; i < len; i++) {
        o[array2[i]] = true;
    }

    let result = [];
    for (let i = 0, len = array1.length; i < len; i++) {
        let v = array1[i];
        if (o[v]) continue;
        result.push(v);
    }
    return result;
};

/*
 * Date format
 */
utils.format = function (date, format) {
    format = format || 'MMddhhmm';
    const o = {
        "M+": date.getMonth() + 1, //month
        "d+": date.getDate(), //day
        "h+": date.getHours(), //hour
        "m+": date.getMinutes(), //minute
        "s+": date.getSeconds(), //second
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
        "S": date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substring(4 - RegExp.$1.length));
    }

    for (let k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ("00" + o[k]).substring(("" + o[k]).length));
        }
    }
    return format;
};

/**
 * check if has Chinese characters.
 */
utils.hasChineseChar = function (str) {
    if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
        return true;
    } else {
        return false;
    }
};

/**
 * transform unicode to utf8
 */
utils.unicodeToUtf8 = function (str) {
    let i, len, ch;
    let utf8Str = "";
    len = str.length;
    for (i = 0; i < len; i++) {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F)) {
            utf8Str += str.charAt(i);

        } else if ((ch >= 0x80) && (ch <= 0x7FF)) {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        }

    }
    return utf8Str;
};

/**
 * Ping server to check if network is available
 *
 */
utils.ping = function (host, cb) {
    if (!utils.isLocal(host)) {
        let cmd = 'ping -w 15 ' + host;
        exec(cmd, function (err, stdout, stderr) {
            if (!!err) {
                cb(false);
                return;
            }
            cb(true);
        });
    } else {
        cb(true);
    }
};

/**
 * Check if server is exsit.
 *
 */
utils.checkPort = function (server, cb) {
    if (!server.port && !server.clientPort || os.platform() === 'win32') {
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
        const portNum = parseInt(portToCheck, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
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
            const validParams = sshParams.filter(param => 
                typeof param === 'string' && /^[a-zA-Z0-9=-]+$/.test(param)
            );
            
            const args = [...validParams, host, 'nc', '-z', host, portNum.toString()];
            
            try {
                const child = spawn('ssh', args, { 
                    stdio: 'pipe',
                    timeout: 5000
                });
                
                let hasError = false;
                child.stderr.on('data', (data) => {
                    hasError = true;
                    logger.warn('SSH port check warning: %s', data.toString().trim());
                });
                
                child.on('close', (code) => {
                    if (hasError) {
                        callback('error');
                    } else if (code === 0) {
                        callback('busy');
                    } else {
                        callback('leisure');
                    }
                });
                
                child.on('error', (err) => {
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
    checkPortInternal(server.port, (result1) => {
        if (result1 === 'busy') {
            this.invokeCallback(cb, 'busy');
        } else if (result1 === 'error') {
            this.invokeCallback(cb, 'error');
        } else {
            // 检查客户端端口
            checkPortInternal(server.clientPort, (result2) => {
                this.invokeCallback(cb, result2);
            });
        }
    });
};

utils.isLocal = function (host) {
    const app = require('../pofresh').app;
    if (!app) {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
    } else {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host) || host === app.master.host;
    }
};

/**
 * Load cluster server.
 *
 */
utils.loadCluster = function (app, server, serverMap) {
    const increaseFields = {};
    const count = parseInt(server[Constants.RESERVED.CLUSTER_COUNT]);
    let seq = app.clusterSeq[server.serverType];
    if (!seq) {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    } else {
        app.clusterSeq[server.serverType] = seq + count;
    }

    for (const key in server) {
        const value = server[key].toString();
        if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0) {
            const base = server[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    const clone = function (src) {
        const rs = {};
        for (let key in src) {
            rs[key] = src[key];
        }
        return rs;
    };
    for (let i = 0, l = seq; i < count; i++, l++) {
        const cserver = clone(server);
        cserver.id = Constants.RESERVED.CLUSTER_PREFIX + server.serverType + '-' + l;
        for (let k in increaseFields) {
            const v = parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
};

utils.extends = function (origin, add) {
    if (!add || !this.isObject(add)) return origin;

    const keys = Object.keys(add);
    let i = keys.length;
    while (i--) {
        origin[keys[i]] = add[keys[i]];
    }
    return origin;
};

utils.headHandler = function (headBuffer) {
    let len = 0;
    for (let i = 1; i < 4; i++) {
        if (i > 1) {
            len <<= 8;
        }
        len += headBuffer.readUInt8(i);
    }
    return len;
};

const localIps = function () {
    const ifaces = os.networkInterfaces();
    const ips = [];
    for (const dev in ifaces) {
        ifaces[dev].forEach(function (details) {
            if (details.family === 'IPv4') {
                ips.push(details.address);
            }
        });
    }
    return ips;
}();

function inLocal(host) {
    for (const index in localIps) {
        if (host === localIps[index]) {
            return true;
        }
    }
    return false;
}

utils.isObject = function (arg) {
    return typeof arg === 'object' && arg !== null;
};
