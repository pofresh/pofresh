/**
 * Component for master.
 */
const Master = require('../master/master');

/**
 * Component factory function
 *
 * @param  {Object} app  current application context
 * @param opts
 * @return {Object}      component instances
 */
module.exports = (app, opts) => new Component(app, opts);

/**
 * Master component class
 *
 * @param {Object} app  current application context
 */
class Component {
    constructor(app, opts) {
        this.name = '__master__';
        this.master = new Master(app, opts);
    }

    /**
     * Component lifecycle function
     */
    async start() {
        await this.master.start();
    }

    /**
     * Component lifecycle function
     *
     * @param  {Boolean}   force whether stop the component immediately
     * @param  {Function}  cb
     * @return {Void}
     */
    stop(_force, cb) {
        this.master.stop(cb);
    }
}
