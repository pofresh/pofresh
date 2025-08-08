const utils = require('../util/utils');
const countDownLatch = require('../util/countDownLatch');
const DefaultChannelManager = require('../manager/redisGlobalChannelManager');
const logger = require('pofresh-logger').getLogger(__filename);

const ST_INITED = 0;
const ST_STARTED = 1;
const ST_CLOSED = 2;

const DEFAULT_PREFIX = 'POFRESH:CHANNEL';

/**
 * Global channel service.
 * GlobalChannelService is created by globalChannel component which is a default
 * component of pofresh enabled by `app.set('globalChannelConfig', {...})`
 * and global channel service would be accessed by
 * `app.get('globalChannelService')`.
 *
 * @class
 * @constructor
 */
class GlobalChannelService {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts || {};
        this.manager = getChannelManager(app, opts);
        this.cleanOnStartUp = opts.cleanOnStartUp;
        this.state = ST_INITED;
    }

    start(cb) {
        if (this.state !== ST_INITED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        if (typeof this.manager.start === 'function') {
            this.manager.start(err => {
                if (!err) {
                    this.state = ST_STARTED;
                }
                if (this.cleanOnStartUp) {
                    this.manager.clean(err => {
                        utils.invokeCallback(cb, err);
                    });
                } else {
                    utils.invokeCallback(cb, err);
                }
            });
        } else {
            process.nextTick(() => {
                utils.invokeCallback(cb);
            });
        }
    }

    stop(force, cb) {
        this.state = ST_CLOSED;

        if (typeof this.manager.stop === 'function') {
            this.manager.stop(force, cb);
        } else {
            process.nextTick(() => {
                utils.invokeCallback(cb);
            });
        }
    }

    /**
     * Destroy a global channel.
     *
     * @param  {String}   name global channel name
     * @param  {Function} cb callback function
     *
     * @memberOf GlobalChannelService
     */
    destroyChannel(name, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.destroyChannel(name, cb);
    }

    /**
     * Add a member into channel.
     *
     * @param  {String}   name channel name
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
    add(name, uid, sid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.add(name, uid, sid, cb);
    }

    /**
     * Remove user from channel.
     *
     * @param  {String}   name channel name
     * @param  {String}   uid  user id
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
    leave(name, uid, sid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.leave(name, uid, sid, cb);
    }

    /**
     * Get members by frontend server id.
     *
     * @param  {String}   name channel name
     * @param  {String}   sid  frontend server id
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
    getMembersBySid(name, sid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.getMembersBySid(name, sid, cb);
    }

    /**
     * Get members by channel name.
     *
     * @param  {String}   stype frontend server type string
     * @param  {String}   name channel name
     * @param  {Function} cb   callback function
     *
     * @memberOf GlobalChannelService
     */
    getMembersByChannelName(stype, name, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        const members = [];
        const servers = this.app.getServersByType(stype);

        if (!servers || servers.length === 0) {
            utils.invokeCallback(cb, null, []);
            return;
        }

        const latch = countDownLatch.createCountDownLatch(servers.length, () => {
            utils.invokeCallback(cb, null, members);
            return;
        });

        for (let i = 0, l = servers.length; i < l; i++) {
            this.getMembersBySid(name, servers[i].id, (err, list) => {
                if (err) {
                    utils.invokeCallback(cb, err, null);
                    return;
                }
                if (list && list.length !== 0) {
                    list.forEach(member => {
                        members.push(member);
                    });
                }
                latch.done();
            });
        }
    }

    /**
     * Send message by global channel.
     *
     * @param  {String}   serverType  frontend server type
     * @param  {String}   route       route string
     * @param  {Object}   msg         message would be sent to clients
     * @param  {String}   channelName channel name
     * @param  {Object}   opts        reserved
     * @param  {Function} cb          callback function
     *
     * @memberOf GlobalChannelService
     */
    pushMessage(serverType, route, msg, channelName, opts, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        const namespace = 'sys';
        const service = 'channelRemote';
        const method = 'pushMessage';
        let failIds = [];
        const servers = this.app.getServersByType(serverType);

        if (!servers || servers.length === 0) {
            // no frontend server infos
            utils.invokeCallback(cb, null, failIds);
            return;
        }

        let successFlag = false;
        const latch = countDownLatch.createCountDownLatch(servers.length, () => {
            if (!successFlag) {
                utils.invokeCallback(cb, new Error('all frontend server push message fail'));
                return;
            }
            utils.invokeCallback(cb, null, failIds);
        });

        const rpcCB = (err, fails) => {
            if (err) {
                logger.error('[pushMessage] fail to dispatch msg, err:' + err.stack);
                latch.done();
                return;
            }
            if (fails) {
                failIds = failIds.concat(fails);
            }
            successFlag = true;
            latch.done();
        };

        for (let i = 0, l = servers.length; i < l; i++) {
            ((self, arg) => {
                self.getMembersBySid(channelName, servers[arg].id, (err, uids) => {
                    if (err) {
                        logger.error('[getMembersBySid] fail to get members, err' + err.stack);
                    }
                    if (uids && uids.length > 0) {
                        self.app.rpcInvoke(
                            servers[arg].id,
                            {
                                namespace,
                                service,
                                method,
                                args: [route, msg, uids, { isPush: true }]
                            },
                            rpcCB
                        );
                    } else {
                        process.nextTick(rpcCB);
                    }
                });
            })(this, i);
        }
    }
}

module.exports = GlobalChannelService;

const getChannelManager = (app, opts) => {
    let manager;
    if (typeof opts.channelManager === 'function') {
        manager = opts.channelManager(app, opts);
    } else {
        manager = opts.channelManager;
    }

    if (!manager) {
        manager = new DefaultChannelManager(app, opts);
    }

    return manager;
};
