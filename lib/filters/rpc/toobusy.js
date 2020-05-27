/**
 * Filter for rpc log.
 * Reject rpc request when toobusy
 */
const rpcLogger = require('pofresh-logger').getLogger('rpc-log', __filename);
let toobusy = null;

const DEFAULT_MAXLAG = 70;
const DEFAULT_INTERVAL = 500;

module.exports = function (maxLag, interval) {
    return new Filter(maxLag || DEFAULT_MAXLAG, interval || DEFAULT_INTERVAL);
};

class Filter {
    constructor(maxLag, interval) {
        this.name = 'toobusy';
        try {
            toobusy = require('toobusy-js');
        } catch (e) {
        }
        if (!!toobusy) {
            toobusy.maxLag(maxLag);
            toobusy.interval(interval);
        }
    }

    /**
     * Before filter for rpc
     */
    before(serverId, msg, opts, next) {
        opts = opts || {};
        if (!!toobusy && toobusy()) {
            rpcLogger.warn('Server too busy for rpc request, serverId:' + serverId + ' msg: ' + msg);
            let err = new Error('Backend server ' + serverId + ' is too busy now!');
            err.code = 500;
            next(err);
        } else {
            next();
        }
    }

    after(serverId, msg, opts, next) {
        next();
    }
}