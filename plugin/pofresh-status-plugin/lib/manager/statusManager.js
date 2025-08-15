const utils = require('../util/utils');
const redis = require('redis');

const DEFAULT_PREFIX = 'POMELO:STATUS';

class StatusManager {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts || {};
        this.prefix = opts.prefix || DEFAULT_PREFIX;
        this.host = opts.host;
        this.port = opts.port;
        this.redis = null;
    }

    start(cb) {
        this.redis = redis.createClient(this.port, this.host, this.opts);
        // if (this.opts.auth_pass) {
        //   this.redis.auth(this.opts.auth_pass);
        // }
        this.redis.on('error', err => {
            // Log Redis connection errors but don't crash
            if (this.logger) {
                this.logger.error('Redis connection error:', err);
            }
        });
        this.redis.once('ready', cb);
        this.redis.connect();
    }

    stop(_force, cb) {
        if (this.redis) {
            this.redis.end();
            this.redis = null;
        }
        utils.invokeCallback(cb);
    }

    clean(cb) {
        const cmds = [];
        this.redis.keys(genCleanKey(this), (err, list) => {
            if (err) {
                utils.invokeCallback(cb, err);
                return;
            }
            for (const item of list) {
                cmds.push(['del', item]);
            }
            execMultiCommands(this.redis, cmds, cb);
        });
    }

    add(uid, sid, cb) {
        this.redis.sAdd(genKey(this, uid), sid, err => {
            utils.invokeCallback(cb, err);
        });
    }

    leave(uid, sid, cb) {
        this.redis.sRem(genKey(this, uid), sid, err => {
            utils.invokeCallback(cb, err);
        });
    }

    async getSidsByUid(uid) {
        return await this.redis.sMembers(genKey(this, uid));
    }

    getSidsByUids(uids, cb) {
        const cmds = [];
        for (const uid of uids) {
            cmds.push(['exists', genKey(this, uid)]);
        }
        execMultiCommands(this.redis, cmds, (err, list) => {
            utils.invokeCallback(cb, err, list);
        });
    }
}

const execMultiCommands = (redisClient, cmds, cb) => {
    if (!cmds.length) {
        utils.invokeCallback(cb);
        return;
    }
    redisClient.multi(cmds).exec((err, replies) => {
        utils.invokeCallback(cb, err, replies);
    });
};

const genKey = (self, uid) => `${self.prefix}:${uid}`;

const genCleanKey = self => `${self.prefix}*`;

module.exports = StatusManager;
