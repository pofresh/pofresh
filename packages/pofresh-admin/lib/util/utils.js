const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const rrl = require('reverse-read-line');
const ErrorHandler = require('./errorHandler');
const configManager = require('./configManager');

const utils = module.exports;

/**
 * Check and invoke callback
 */
utils.invokeCallback = cb => {
    if (!!cb && typeof cb === 'function') {
        try {
            cb.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (err) {
            // 使用ErrorHandler来安全处理回调错误
            const logger = require('pofresh-logger').getLogger('pofresh-admin', 'utils');
            logger.error('Error in callback execution:', err);
        }
    }
};

/**
 * 安全的回调调用，使用ErrorHandler
 */
utils.safeCallback = (cb, err, result) => {
    ErrorHandler.safeCallback(cb, err, result);
};

/**
 * 创建带超时的回调
 */
utils.createTimeoutCallback = (cb, timeout, operation) => ErrorHandler.createTimeoutCallback(cb, timeout, operation);

/**
 * 验证参数
 */
utils.validateParams = (params, required, types) => ErrorHandler.validateParams(params, required, types);

/*
 * Date format
 */
utils.format = (date, format) => {
    format = format || 'MM-dd-hhmm';
    const o = {
        'M+': date.getMonth() + 1, //month
        'd+': date.getDate(), //day
        'h+': date.getHours(), //hour
        'm+': date.getMinutes(), //minute
        's+': date.getSeconds(), //second
        'q+': Math.floor((date.getMonth() + 3) / 3), //quarter
        S: date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
    }
    for (const k in o) {
        if (new RegExp(`(${k})`).test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : `00${o[k]}`.substr(`${o[k]}`.length));
        }
    }

    return format;
};

utils.compareServer = (server1, server2) => server1.host === server2.host && server1.port === server2.port;

/**
 * Get the count of elements of object
 */
utils.size = (obj, type) => {
    let count = 0;
    for (const i in obj) {
        if (Object.hasOwn(obj, i) && typeof obj[i] !== 'function') {
            if (!type) {
                count++;
                continue;
            }

            if (type && type === obj[i].type) {
                count++;
            }
        }
    }
    return count;
};

utils.md5 = str => {
    const md5sum = crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
};

utils.defaultAuthUser = (msg, env, cb) => {
    // 使用ErrorHandler进行参数验证
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

    // 使用ErrorHandler的安全异步操作和ConfigManager
    ErrorHandler.safeAsyncOperation(
        () => {
            const adminUsers = configManager.loadAdminUsers(env);

            if (!adminUsers || adminUsers.length === 0) {
                return null; // 没有配置用户，返回null
            }

            const username = msg.username;
            const password = msg.password;
            const md5 = msg.md5;

            const user = adminUsers.find(u => {
                if (!u || typeof u !== 'object' || u.username !== username) {
                    return false;
                }
                return md5 ? utils.md5(u.password) === password : u.password === password;
            });

            return user;
        },
        cb,
        'User authentication'
    );
};

utils.defaultAuthServerMaster = (msg, env, cb) => {
    const type = msg.serverType;
    const token = msg.token;
    if (type === 'master') {
        return cb('ok');
    }

    let servers = null;
    const appBase = path.dirname(require.main.filename);
    const serverPath = path.join(appBase, '/config/adminServer.json');
    let presentPath = null;
    if (env) {
        presentPath = path.join(appBase, 'config', env, 'adminServer.json');
    }

    if (fs.existsSync(serverPath)) {
        servers = require(serverPath);
    } else if (fs.existsSync(presentPath)) {
        servers = require(presentPath);
    } else {
        return cb('ok');
    }

    if (!servers || servers.length === 0) {
        return cb('bad');
    }

    const ok = servers.find(server => server.type === type && server.token === token);
    cb(ok ? 'ok' : 'bad');
};

utils.defaultAuthServerMonitor = (msg, env, cb) => {
    const type = msg.serverType;

    let servers = null;
    const appBase = path.dirname(require.main.filename);
    const serverPath = path.join(appBase, '/config/adminServer.json');
    let presentPath = null;
    if (env) {
        presentPath = path.join(appBase, 'config', env, 'adminServer.json');
    }

    if (fs.existsSync(serverPath)) {
        servers = require(serverPath);
    } else if (fs.existsSync(presentPath)) {
        servers = require(presentPath);
    } else {
        return cb('ok');
    }

    if (!servers || servers.length === 0) {
        return cb();
    }

    const server = servers.find(server => server.type === type);
    cb(server ? server.token : null);
};

utils.tail = async (filename, num) => {
    const reader = rrl.create(filename);
    await reader.open();
    const lines = await reader.readLines(num || 10);
    await reader.close();
    return lines;
};
