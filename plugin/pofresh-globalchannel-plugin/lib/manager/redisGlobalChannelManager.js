const utils = require('../util/utils');
const redis = require('redis');

const DEFAULT_PREFIX = 'POFRESH:CHANNEL';

class GlobalChannelManager {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts || {};
        this.prefix = opts.prefix || DEFAULT_PREFIX;
        this.host = opts.host;
        this.port = opts.port;
        this.db = opts.db || '0';
        this.redis = null;
    }

    start(cb) {
        this.redis = redis.createClient(this.port, this.host, this.opts);
        this.redis.on('error', _err => {});
        this.redis.once('ready', err => {
            if (err) {
                cb(err);
            } else {
                this.redis.select(this.db, cb);
            }
        });

        this.redis.connect();
    }

    stop(_force, cb) {
        if (this.redis) {
            this.redis.end();
            this.redis = null;
        }
        utils.invokeCallback(cb);
    }

    async clean() {
        const list = await redis.keys(genCleanKey(this));
        const mu = this.redis.multi();
        list.forEach(key => mu.del(key));
        return await mu.exec();
    }

    async destroyChannel(name) {
        const servers = this.app.getServers();
        let server;
        const mu = this.redis.multi();
        for (const sid in servers) {
            server = servers[sid];
            if (this.app.isFrontend(server)) {
                mu.del(genKey(this, name, sid));
            }
        }
        return await mu.exec();
    }

    async add(name, uid, sid) {
        return await this.redis.sAdd(genKey(this, name, sid), uid);
    }

    async leave(name, uid, sid) {
        return await this.redis.sRem(genKey(this, name, sid), uid);
    }

    async getMembersBySid(name, sid) {
        return await this.redis.sMembers(genKey(this, name, sid));
    }
}

module.exports = GlobalChannelManager;

const genKey = (self, name, sid) => `${self.prefix}:${name}:${sid}`;

const genCleanKey = self => `${self.prefix}*`;
