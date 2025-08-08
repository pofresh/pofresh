/**
 * Filter for toobusy.
 * if the process is toobusy, just skip the new request
 */
const conLogger = require('pofresh-logger').getLogger('con-log', __filename);
const DEFAULT_MAXLAG = 70;
const DEFAULT_INTERVAL = 500;

let toobusy = null;

module.exports = (maxLag, interval) => new Filter(maxLag || DEFAULT_MAXLAG, interval || DEFAULT_INTERVAL);

class Filter {
    constructor(maxLag, interval) {
        try {
            toobusy = require('toobusy-js');
        } catch (_e) {}
        if (toobusy) {
            toobusy.maxLag(maxLag);
            toobusy.interval(interval);
        }
    }

    before(msg, _session, next) {
        if (!!toobusy && toobusy()) {
            conLogger.warn(`[toobusy] reject request msg: ${msg}`);
            const err = new Error('Server toobusy!');
            err.code = 500;
            next(err);
        } else {
            next();
        }
    }

    after(_err, _msg, _session, _resp, next) {
        next();
    }
}
