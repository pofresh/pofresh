/**
 * Filter for rpc log.
 * Record used time for remote process call.
 */
const rpcLogger = require('pofresh-logger').getLogger('rpc-log', __filename);
const utils = require('../../util/utils');

module.exports = function () {
    return new Filter();
};

class Filter {
    constructor() {
        this.name = 'rpcLog';
    }

    /**
     * Before filter for rpc
     */
    before(serverId, msg, opts, next) {
        opts = opts || {};
        opts.__start_time__ = Date.now();
        next();
    }

    /**
     * After filter for rpc
     */
    after(serverId, msg, opts, next) {
        if (!!opts && !!opts.__start_time__) {
            let start = opts.__start_time__;
            let end = Date.now();
            let timeUsed = end - start;
            let log = {
                route: msg.service,
                args: msg.args,
                time: utils.format(new Date(start)),
                timeUsed: timeUsed
            };
            rpcLogger.info(JSON.stringify(log));
        }
        next();
    }
}


