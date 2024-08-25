/**
 * Filter for timeout.
 * Print a warn information when request timeout.
 */
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const utils = require('../../util/utils');

const DEFAULT_TIMEOUT = 3000;
const DEFAULT_SIZE = 500;

module.exports = function (timeout, maxSize) {
    return new Filter(timeout || DEFAULT_TIMEOUT, maxSize || DEFAULT_SIZE);
};

class Filter {
    constructor(timeout, maxSize) {
        this.timeout = timeout;
        this.maxSize = maxSize;
        this.timeouts = {};
        this.curId = 0;
    }

    before(msg, session, next) {
        let count = utils.size(this.timeouts);
        if (count > this.maxSize) {
            logger.warn('timeout filter is out of range, current size is %s, max size is %s', count, this.maxSize);
            next();
            return;
        }
        this.curId++;
        this.timeouts[this.curId] = setTimeout(function () {
            logger.error('request %j timeout.', msg.__route__);
        }, this.timeout);
        session.__timeout__ = this.curId;
        next();
    }

    after(err, msg, session, resp, next) {
        let timeout = this.timeouts[session.__timeout__];
        if (timeout) {
            clearTimeout(timeout);
            delete this.timeouts[session.__timeout__];
        }
        next(err);
    }

}

