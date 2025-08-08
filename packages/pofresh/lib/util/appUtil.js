const async = require('async');
const utils = require('./utils');
const path = require('path');
const fs = require('fs');
const Constants = require('./constants');
const starter = require('../master/starter');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);

const exp = module.exports;

/**
 * Initialize application configuration.
 */
exp.defaultConfiguration = app => {
    const args = parseArgs(process.argv);
    setupEnv(app, args);
    loadMaster(app);
    loadServers(app);
    processArgs(app, args);
    configLogger(app);
};

/**
 * Start servers by type.
 */
exp.startByType = (app, cb) => {
    loadLifecycle(app, app.enabled(Constants.LIFECYCLE.RELOAD));

    if (app.startId) {
        if (app.startId === Constants.RESERVED.MASTER) {
            utils.invokeCallback(cb);
        } else {
            starter.runServers(app);
        }
    } else if (!!app.type && app.type !== Constants.RESERVED.ALL && app.type !== Constants.RESERVED.MASTER) {
        starter.runServers(app);
    } else {
        utils.invokeCallback(cb);
    }
};

/**
 * Load default components for application.
 */
exp.loadDefaultComponents = app => {
    const pofresh = require('../pofresh');
    // load system default components
    if (app.serverType === Constants.RESERVED.MASTER) {
        app.load(pofresh.master, app.get('masterConfig'));
    } else {
        app.load(pofresh.proxy, app.get('proxyConfig'));
        if (app.getCurServer().port) {
            app.load(pofresh.remote, app.get('remoteConfig'));
        }
        if (app.isFrontend()) {
            app.load(pofresh.connection, app.get('connectionConfig'));
            app.load(pofresh.connector, app.get('connectorConfig'));
            app.load(pofresh.session, app.get('sessionConfig'));
            app.load(pofresh.pushScheduler, app.get('pushSchedulerConfig'));
        }
        app.load(pofresh.backendSession, app.get('backendSessionConfig'));
        app.load(pofresh.channel, app.get('channelConfig'));
        app.load(pofresh.server, app.get('serverConfig'));
    }
    app.load(pofresh.monitor, app.get('monitorConfig'));
};

/**
 * Stop components.
 *
 * @param  {Array}  comps component list
 * @param  {Number}   index current component index
 * @param  {Boolean}  force whether stop component immediately
 * @param  {Function} cb
 */
exp.stopComps = (comps, index, force, cb) => {
    if (index >= comps.length) {
        utils.invokeCallback(cb);
        return;
    }
    const comp = comps[index];
    if (typeof comp.stop === 'function') {
        comp.stop(force, () => {
            // ignore any error
            exp.stopComps(comps, index + 1, force, cb);
        });
    } else {
        exp.stopComps(comps, index + 1, force, cb);
    }
};

/**
 * Apply command to loaded components.
 * This method would invoke the component {method} in series.
 * Any component {method} return err, it would return err directly.
 *
 * @param {Array} comps loaded component list
 * @param {String} method component lifecycle method name, such as: start, stop
 * @param {Function} cb
 */
exp.optComponents = (comps, method, cb) => {
    async.forEachSeries(
        comps,
        (comp, done) => {
            if (typeof comp[method] === 'function') {
                comp[method](done);
            } else {
                done();
            }
        },
        err => {
            if (err) {
                if (typeof err === 'string') {
                    logger.error('fail to operate component, method: %s, err: %j', method, err);
                } else {
                    logger.error('fail to operate component, method: %s, err: %j', method, err.stack);
                }
            }
            utils.invokeCallback(cb, err);
        }
    );
};

/**
 * Load server info from config/servers.json.
 */
function loadServers(app) {
    app.loadConfigBaseApp(Constants.RESERVED.SERVERS, Constants.FILEPATH.SERVER);
    const servers = app.get(Constants.RESERVED.SERVERS);
    let serverMap = {},
        slist,
        i,
        l,
        server;
    for (const serverType in servers) {
        slist = servers[serverType];
        for (i = 0, l = slist.length; i < l; i++) {
            server = slist[i];
            server.serverType = serverType;
            if (server[Constants.RESERVED.CLUSTER_COUNT]) {
                utils.loadCluster(app, server, serverMap);
                continue;
            }
            serverMap[server.id] = server;
        }
    }
    app.set(Constants.KEYWORDS.SERVER_MAP, serverMap);
}

/**
 * Load master info from config/master.json.
 */
function loadMaster(app) {
    app.loadConfigBaseApp(Constants.RESERVED.MASTER, Constants.FILEPATH.MASTER);
    app.master = app.get(Constants.RESERVED.MASTER);
}

/**
 * Process server start command
 */
function processArgs(app, args) {
    const serverType = args.serverType || Constants.RESERVED.MASTER;
    const master = app.getMaster();
    const serverId = args.id || master?.id || 'master-server-1';
    const mode = args.mode || Constants.RESERVED.CLUSTER;
    const masterha = args.masterha || 'false';
    const type = args.type || Constants.RESERVED.ALL;
    const startId = args.startId;

    app.set(Constants.RESERVED.MAIN, args.main, true);
    app.set(Constants.RESERVED.SERVER_TYPE, serverType, true);
    app.set(Constants.RESERVED.SERVER_ID, serverId, true);
    app.set(Constants.RESERVED.MODE, mode, true);
    app.set(Constants.RESERVED.TYPE, type, true);
    if (startId) {
        app.set(Constants.RESERVED.STARTID, startId, true);
    }

    if (masterha === 'true') {
        app.master = args;
        app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
    } else if (serverType !== Constants.RESERVED.MASTER) {
        app.set(Constants.RESERVED.CURRENT_SERVER, args, true);
    } else {
        app.set(Constants.RESERVED.CURRENT_SERVER, app.getMaster(), true);
    }
}

/**
 * Setup enviroment.
 */
function setupEnv(app, args) {
    app.set(Constants.RESERVED.ENV, args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV, true);
}

/**
 * Configure custom logger.
 */
function configLogger(app) {
    app.configureLogger(require('pofresh-logger'));
}

/**
 * Parse command line arguments.
 *
 * @param args command line arguments
 *
 * @return Object argsMap map of arguments
 */
function parseArgs(args) {
    const argsMap = {};
    let mainPos = 1;

    while (args[mainPos].indexOf('--') > 0) {
        mainPos++;
    }
    argsMap.main = args[mainPos];

    for (let i = mainPos + 1; i < args.length; i++) {
        const arg = args[i];
        const sep = arg.indexOf('=');
        const key = arg.slice(0, sep);
        let value = arg.slice(sep + 1);
        if (!Number.isNaN(Number(value)) && value.indexOf('.') < 0) {
            value = Number(value);
        }
        argsMap[key] = value;
    }
    return argsMap;
}

/**
 * Load lifecycle file.
 *
 */
function loadLifecycle(app, reload) {
    const filePath = path.join(
        app.getBase(),
        Constants.FILEPATH.SERVER_DIR,
        app.serverType,
        Constants.FILEPATH.LIFECYCLE
    );
    if (!fs.existsSync(filePath)) {
        return;
    }
    const lifecycle = require(filePath);
    for (const key in lifecycle) {
        if (typeof lifecycle[key] === 'function') {
            app.lifecycleCbs[key] = lifecycle[key];
        } else {
            logger.warn('lifecycle.js in %s is error format.', filePath);
        }
    }

    if (reload) {
        fs.watch(filePath, event => {
            if (event === 'change') {
                delete require.cache[require.resolve(filePath)];
                loadLifecycle(app);
            }
        });
    }
}
