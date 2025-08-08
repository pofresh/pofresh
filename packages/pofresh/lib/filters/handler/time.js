/**
 * Filter for statistics.
 * Record used time for each request.
 */
const conLogger = require('pofresh-logger').getLogger('con-log', __filename);
const utils = require('../../util/utils');

module.exports = () => new Filter();

class Filter {
    before(_msg, session, next) {
        session.__startTime__ = Date.now();
        next();
    }

    after(err, msg, session, _resp, next) {
        const start = session.__startTime__;
        if (typeof start === 'number') {
            const timeUsed = Date.now() - start;
            const log = {
                route: msg.__route__,
                args: msg,
                time: utils.format(new Date(start)),
                timeUsed
            };
            conLogger.info(JSON.stringify(log));
        }
        next(err);
    }
}
