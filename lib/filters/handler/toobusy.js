/**
 * Filter for toobusy.
 * if the process is toobusy, just skip the new request
 */
const conLogger = require('pofresh-logger').getLogger('con-log', __filename);
const DEFAULT_MAXLAG = 70;

let toobusy = null;

module.exports = function (maxLag) {
    return new Filter(maxLag || DEFAULT_MAXLAG);
};

class Filter {
    constructor(maxLag) {
        try {
            toobusy = require('toobusy');
        } catch (e) {
        }
        if (!!toobusy) {
            toobusy.maxLag(maxLag);
        }
    }

    before(msg, session, next) {
        if (!!toobusy && toobusy()) {
            conLogger.warn('[toobusy] reject request msg: ' + msg);
            let err = new Error('Server toobusy!');
            err.code = 500;
            next(err);
        } else {
            next();
        }
    }

    after(err, msg, session, resp, next) {
        next();
    }
}

