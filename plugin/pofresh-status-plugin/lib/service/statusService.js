const DefaultStatusManager = require('../manager/statusManager');
const utils = require('../util/utils');
const util = require('util');
const countDownLatch = require('../util/countDownLatch');
const _logger = require('pofresh-logger').getLogger(__filename);

const ST_INITED = 0;
const ST_STARTED = 1;
const ST_CLOSED = 2;

class StatusService {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts || {};
        this.cleanOnStartUp = opts.cleanOnStartUp;
        this.manager = getStatusManager(app, opts);
        this.state = ST_INITED;
    }

    start(cb) {
        if (this.state !== ST_INITED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        if (typeof this.manager.start === 'function') {
            this.manager.start(startErr => {
                if (!startErr) {
                    this.state = ST_STARTED;
                }
                if (this.cleanOnStartUp) {
                    this.manager.clean(cleanErr => {
                        utils.invokeCallback(cb, cleanErr);
                    });
                } else {
                    utils.invokeCallback(cb, startErr);
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

    add(uid, sid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.add(uid, sid, cb);
    }

    leave(uid, sid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.leave(uid, sid, cb);
    }

    async getSidsByUid(uid) {
        if (this.state !== ST_STARTED) {
            throw new Error('invalid state');
        }

        return await this.manager.getSidsByUid(uid);
    }

    getStatusByUid(uid, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.getSidsByUid(uid, (err, list) => {
            if (err) {
                utils.invokeCallback(
                    cb,
                    new Error(util.format('failed to get serverIds by uid: [%s], err: %j', uid, err.stack)),
                    null
                );
                return;
            }
            const status = !!(list !== undefined && list.length >= 1); // offline
            utils.invokeCallback(cb, null, status);
        });
    }

    getStatusByUids(uids, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }

        this.manager.getSidsByUids(uids, (err, replies) => {
            if (err) {
                utils.invokeCallback(
                    cb,
                    new Error(util.format('failed to get serverIds by uids, err: %j', err.stack)),
                    null
                );
                return;
            }

            const statuses = {};
            for (let i = 0; i < uids.length; i++) {
                statuses[uids[i]] = replies[i] === 1; // offline
            }

            utils.invokeCallback(cb, null, statuses);
        });
    }

    pushByUids(uids, route, msg, cb) {
        if (this.state !== ST_STARTED) {
            utils.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        const channelService = this.app.get('channelService');
        let successFlag = false;
        const count = utils.size(uids);
        const records = [];

        const latch = countDownLatch.createCountDownLatch(count, () => {
            if (successFlag) {
                if (records != null && records.length !== 0) {
                    channelService.pushMessageByUids(route, msg, records, cb);
                } else {
                    utils.invokeCallback(cb, null, null);
                }
            } else {
                utils.invokeCallback(cb, new Error(util.format('failed to get sids for uids: %j', uids)), null);
                return;
            }
        });

        for (let i = 0; i < uids.length; i++) {
            ((self, arg) => {
                self.getSidsByUid(uids[arg], (err, list) => {
                    if (err) {
                        utils.invokeCallback(
                            cb,
                            new Error(
                                util.format('failed to get serverIds by uid: [%s], err: %j', uids[arg], err.stack)
                            ),
                            null
                        );
                        return;
                    }
                    for (let j = 0, l = list.length; j < l; j++) {
                        records.push({ uid: uids[arg], sid: list[j] });
                    }

                    successFlag = true;
                    latch.done();
                });
            })(this, i);
        }
    }
}

const getStatusManager = (app, opts) => {
    let manager;

    if (typeof opts.statusManager === 'function') {
        manager = opts.statusManager(app, opts);
    } else {
        manager = opts.statusManager;
    }

    if (!manager) {
        manager = new DefaultStatusManager(app, opts);
    }

    return manager;
};

module.exports = StatusService;
