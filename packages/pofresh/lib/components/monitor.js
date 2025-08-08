/**
 * Component for monitor.
 * Load and start monitor client.
 */
const Monitor = require('../monitor/monitor');

/**
 * Component factory function
 *
 * @param  {Object} app  current application context
 * @return {Object}      component instances
 */
module.exports = (app, opts) => new Component(app, opts);

class Component {
    constructor(app, opts) {
        this.name = '__monitor__';
        this.monitor = new Monitor(app, opts);
    }

    start(cb) {
        this.monitor.start(cb);
    }

    stop(_force, cb) {
        this.monitor.stop(cb);
    }

    reconnect(masterInfo) {
        this.monitor.reconnect(masterInfo);
    }
}
