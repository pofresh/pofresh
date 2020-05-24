/**
 * Filter to keep request sequence.
 */
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const taskManager = require('../../common/manager/taskManager');
const DEFAULT_TIMEOUT = 3000;

module.exports = function (timeout) {
    return new Filter(timeout);
};

class Filter {
    constructor(timeout) {
        this.timeout = timeout || DEFAULT_TIMEOUT;
    }

    /**
     * request serialization after filter
     */
    before(msg, session, next) {
        taskManager.addTask(session.id, function (task) {
            session.__serialTask__ = task;
            next();
        }, function () {
            logger.error('[serial filter] msg timeout, msg:' + JSON.stringify(msg));
        }, this.timeout);
    }

    /**
     * request serialization after filter
     */
    after(err, msg, session, resp, next) {
        let task = session.__serialTask__;
        if (task) {
            if (!task.done() && !err) {
                err = new Error('task time out. msg:' + JSON.stringify(msg));
            }
        }
        next(err);
    }
}

