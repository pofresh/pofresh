/**
 * Component for remote service.
 * Load remote service and add to global context.
 */
const fs = require('fs');
const pathUtil = require('../util/pathUtil');
const RemoteServer = require('pofresh-rpc').server;

/**
 * Remote component factory function
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 *                       opts.acceptorFactory {Object}: acceptorFactory.create(opts, cb)
 * @return {Object}     remote component instances
 */
module.exports = function (app, opts) {
    opts = opts || {};

    //just for compatibility here.
    opts.bufferMsg = opts.bufferMsg || false;
    opts.interval = opts.interval || 30;
    if (app.enabled('rpcDebugLog')) {
        opts.rpcDebugLog = true;
        opts.rpcLogger = require('pofresh-logger').getLogger('rpc-debug', __filename);
    }
    return new Component(app, opts);
};

/**
 * Remote component class
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 */
class Component {
    constructor(app, opts) {
        this.name = '__remote__';

        this.app = app;
        this.opts = opts;
    }

    /**
     * Remote component lifecycle function
     *
     * @param {Function} cb
     * @return {Void}
     */
    start(cb) {
        this.opts.port = this.app.getCurServer().port;
        this.remote = genRemote(this.app, this.opts);
        this.remote.start();
        process.nextTick(cb);
    }

    /**
     * Remote component lifecycle function
     *
     * @param {Boolean}  force whether stop the component immediately
     * @param {Function}  cb
     * @return {Void}
     */
    stop(force, cb) {
        this.remote.stop(force);
        process.nextTick(cb);
    }
}

/**
 * Generate remote server instance
 *
 * @param {Object} app current application context
 * @param {Object} opts contructor parameters for rpc Server
 * @return {Object} remote server instance
 */
function genRemote(app, opts) {
    opts.paths = getRemotePaths(app);
    opts.context = app;
    if (!!opts.rpcServer) {
        return opts.rpcServer.create(opts);
    } else {
        return RemoteServer.create(opts);
    }
}


/**
 * Get remote paths from application
 *
 * @param {Object} app current application context
 * @return {Array} paths
 *
 */
function getRemotePaths(app) {
    let paths = [];

    let role;
    // master server should not come here
    if (app.isFrontend()) {
        role = 'frontend';
    } else {
        role = 'backend';
    }

    let sysPath = pathUtil.getSysRemotePath(role), serverType = app.getServerType();
    if (fs.existsSync(sysPath)) {
        paths.push(pathUtil.remotePathRecord('sys', serverType, sysPath));
    }
    let userPath = pathUtil.getUserRemotePath(app.getBase(), serverType);
    if (fs.existsSync(userPath)) {
        paths.push(pathUtil.remotePathRecord('user', serverType, userPath));
    }

    return paths;
}
