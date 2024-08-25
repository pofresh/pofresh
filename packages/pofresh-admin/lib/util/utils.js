const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const rrl = require('reverse-read-line');

const utils = module.exports;

/**
 * Check and invoke callback
 */
utils.invokeCallback = function (cb) {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/*
 * Date format
 */
utils.format = function (date, format) {
    format = format || 'MM-dd-hhmm';
    let o = {
        "M+": date.getMonth() + 1, //month
        "d+": date.getDate(), //day
        "h+": date.getHours(), //hour
        "m+": date.getMinutes(), //minute
        "s+": date.getSeconds(), //second
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
        "S": date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (let k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1,
                RegExp.$1.length === 1 ? o[k] :
                    ("00" + o[k]).substr(("" + o[k]).length));
        }
    }

    return format;
};

utils.compareServer = function (server1, server2) {
    return (server1.host === server2.host) && (server1.port === server2.port);
};

/**
 * Get the count of elements of object
 */
utils.size = function (obj, type) {
    let count = 0;
    for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
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

utils.md5 = function (str) {
    const md5sum = crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
};

utils.defaultAuthUser = function (msg, env, cb) {
    let adminUsers = null;
    const appBase = path.dirname(require.main.filename);
    const adminUserPath = path.join(appBase, '/config/adminUser.json');
    const presentPath = path.join(appBase, 'config', env, 'adminUser.json');
    if (fs.existsSync(adminUserPath)) {
        adminUsers = require(adminUserPath);
    } else if (fs.existsSync(presentPath)) {
        adminUsers = require(presentPath);
    }

    if (!adminUsers || adminUsers.length === 0) {
        return cb(null);
    }

    const username = msg.username;
    const password = msg.password;
    const md5 = msg.md5;

    const user = adminUsers.find(u => {
        if (u.username !== username) {
            return false;
        }
        return md5 ? utils.md5(u.password) === password : u.password === password;
    });

    cb(user);
};

utils.defaultAuthServerMaster = function (msg, env, cb) {
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

    if(!servers || servers.length === 0) {
        return cb('bad');
    }

    const ok = servers.find(server => server.type === type && server.token === token);
    cb(ok ? 'ok' : 'bad');
};

utils.defaultAuthServerMonitor = function (msg, env, cb) {
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

    if(!servers || servers.length === 0) {
        return cb();
    }

    const server = servers.find(server => server.type === type);
    cb(server ? server.token : null);
};

utils.tail = async function (filename, num) {
    const reader = rrl.create(filename);
    await reader.open();
    const lines = await reader.readLines(num || 10);
    await reader.close();
    return lines;
};
