const path = require('path');
const logger = require('pofresh-logger');
const starter = require('../master/starter.js');
const Constants = require('./constants.js');
const utils = require('./utils.js');

const LOG = logger.getLogger('pofresh', 'appUtil.js');
const ARG_REGEX = /^--?/;

/**
 * Application utility functions for Pofresh framework
 * Provides configuration, component management, and server lifecycle utilities
 */

/**
 * Initialize application configuration
 * @param {Object} app - Application instance
 * @returns {Promise<void>}
 */
function defaultConfiguration(app) {
    const args = parseArgs(process.argv);
    setupEnv(app, args);
    loadMaster(app);
    loadServers(app);
    processArgs(app, args);
    configLogger(app);
}

/**
 * Start servers by type
 * @param {Object} app - Application instance
 * @param {string} serverType - Server type to start
 */
async function startServersByType(app, serverType) {
    const serverMap = app.get(Constants.KEYWORDS.SERVER_MAP);
    const servers = Object.values(serverMap).filter(server => server.serverType === serverType);

    if (!servers.length) {
        return;
    }

    await startServers(servers, 0);
}

/**
 * Stop servers by type
 * @param {Object} app - Application instance
 * @param {string} serverType - Server type to stop
 * @param {function} callback - Completion callback
 */
async function stopServersByType(app, serverType, callback) {
    const serverMap = app.get(Constants.KEYWORDS.SERVER_MAP);
    const servers = Object.values(serverMap).filter(server => server.serverType === serverType);

    if (!servers.length) {
        utils.invokeCallback(callback);
        return;
    }

    await stopServers(servers, 0, callback);
}

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(args) {
    const result = {};
    const processedArgs = args.slice(2);

    for (const arg of processedArgs) {
        const [key, _value] = arg.replace(ARG_REGEX, '').split('=');
        result[key] = true;
    }

    return result;
}

/**
 * Setup environment based on arguments
 * @param {Object} app - Application instance
 * @param {Object} args - Parsed arguments
 */
function setupEnv(app, args) {
    const env = args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV;
    app.set(Constants.RESERVED.ENV, env, true);

    if (args.development || args.dev) {
        app.set(Constants.RESERVED.ENV, Constants.RESERVED.ENV_DEV, true);
    } else if (args.production || args.pro) {
        app.set(Constants.RESERVED.ENV, Constants.RESERVED.ENV_PRO, true);
    }

    try {
        const base = args.base || process.cwd();
        app.set(Constants.RESERVED.BASE, base, true);
        LOG.info('Application base path set to: %s', base);
    } catch (error) {
        LOG.error('Failed to setup base path: %s', error.message);
        throw error;
    }
}

/**
 * Load master server configuration
 * @param {Object} app - Application instance
 */
function loadMaster(app) {
    try {
        const masterPath = path.join(app.getBase(), Constants.FILEPATH.MASTER);
        const master = require(masterPath);
        app.set(Constants.RESERVED.MASTER, master, true);
        LOG.info('Master configuration loaded from: %s', masterPath);
    } catch (error) {
        LOG.error('Failed to load master configuration: %s', error.message);
        throw error;
    }
}

/**
 * Load server configurations
 * @param {Object} app - Application instance
 */
function loadServers(app) {
    try {
        const serverPath = path.join(app.getBase(), Constants.FILEPATH.SERVER);
        const servers = require(serverPath);
        app.set(Constants.KEYWORDS.SERVER_MAP, servers, true);
        LOG.info('Server configuration loaded from: %s', serverPath);
    } catch (error) {
        LOG.error('Failed to load server configuration: %s', error.message);
        throw error;
    }
}

/**
 * Process command line arguments
 * @param {Object} app - Application instance
 * @param {Object} args - Parsed arguments
 */
function processArgs(app, args) {
    if (args['start-all']) {
        app.set(Constants.RESERVED.MODE, Constants.RESERVED.ALL, true);
    }

    if (args['server-type']) {
        app.set(Constants.RESERVED.SERVER_TYPE, args['server-type'], true);
    }
}

/**
 * Configure application logger
 * @param {Object} app - Application instance
 */
function configLogger(app) {
    if (process.env.pofresh_LOGGER === 'off') {
        return;
    }

    const base = app.getBase();
    const logPath = path.join(base, Constants.FILEPATH.LOG);

    try {
        const logConfig = require(logPath);
        logger.configure(logConfig);
        LOG.info('Logger configured successfully');
    } catch (error) {
        LOG.warn('Failed to configure logger: %s. Using default configuration.', error.message);
    }
}

/**
 * Start servers sequentially
 * @private
 */
async function startServers(servers, index) {
    if (index >= servers.length) {
        return;
    }

    const server = servers[index];
    try {
        await new Promise((resolve, reject) => {
            starter.startServer(server, error => {
                if (error) {
                    LOG.error('Failed to start server %s: %s', server.id, error.message);
                    reject(error);
                } else {
                    LOG.info('Server %s started successfully', server.id);
                    resolve();
                }
            });
        });
        await startServers(servers, index + 1);
    } catch (error) {
        throw error;
    }
}

/**
 * Stop servers sequentially
 * @private
 */
async function stopServers(servers, index) {
    if (index >= servers.length) {
        return;
    }

    const server = servers[index];
    try {
        await new Promise((resolve, reject) => {
            starter.stopServer(server, error => {
                if (error) {
                    LOG.error('Failed to stop server %s: %s', server.id, error.message);
                    reject(error);
                } else {
                    LOG.info('Server %s stopped successfully', server.id);
                    resolve();
                }
            });
        });
        await stopServers(servers, index + 1);
    } catch (error) {
        throw error;
    }
}

module.exports = {
    defaultConfiguration,
    startServersByType,
    stopServersByType,
    parseArgs,
    setupEnv,
    loadMaster,
    loadServers,
    processArgs,
    configLogger,
    startServers,
    stopServers
};
