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
    let md5sum = crypto.createHash('md5');
    md5sum.update(str);
    str = md5sum.digest('hex');
    return str;
};

utils.defaultAuthUser = function (msg, env, cb) {
    let adminUser = null;
    const appBase = path.dirname(require.main.filename);
    const adminUserPath = path.join(appBase, '/config/adminUser.json');
    const presentPath = path.join(appBase, 'config', env, 'adminUser.json');
    if (fs.existsSync(adminUserPath)) {
        adminUser = require(adminUserPath);
    } else if (fs.existsSync(presentPath)) {
        adminUser = require(presentPath);
    } else {
        cb(null);
        return;
    }
    const username = msg.username;
    const password = msg.password;
    const md5 = msg.md5;

    const len = adminUser.length;
    let user;
    let i = 0;
    if (md5) {
        for (i = 0; i < len; i++) {
            user = adminUser[i];
            let p = "";
            if (user.username === username) {
                p = utils.md5(user.password);
                if (password === p) {
                    cb(user);
                    return;
                }
            }
        }
    } else {
        for (i = 0; i < len; i++) {
            user = adminUser[i];
            if (user.username === username && user.password === password) {
                cb(user);
                return;
            }
        }
    }
    cb(null);
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
        cb('ok');
        return;
    }

    const len = servers.length;
    for (let i = 0; i < len; i++) {
        let server = servers[i];
        if (server.type === type && server.token === token) {
            cb('ok');
            return;
        }
    }
    cb('bad');
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
        cb('ok');
        return;
    }

    const len = servers.length;
    for (let i = 0; i < len; i++) {
        let server = servers[i];
        if (server.type === type) {
            cb(server.token);
            return;
        }
    }
    cb(null);
};

utils.tail = async function (filename, num) {
    const reader = rrl.create(filename);
    await reader.open();
    const lines = await reader.readLines(num || 10);
    await reader.close();
    return lines;
};
