const { promisify } = require('util');
const utils = require('./utils');
const path = require('path');
const fs = require('fs');
const { existsSync } = require('fs');
const Constants = require('./constants');
const starter = require('../master/starter');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);

/**
 * Application utility functions for Pofresh framework
 * Provides configuration, component management, and server lifecycle utilities
 */
class AppUtil {
    /**
     * Initialize application configuration
     * @param {Object} app - Application instance
     */
    static defaultConfiguration(app) {
        const args = AppUtil.parseArgs(process.argv);
        AppUtil.setupEnv(app, args);
        AppUtil.loadMaster(app);
        AppUtil.loadServers(app);
        AppUtil.processArgs(app, args);
        AppUtil.configLogger(app);
    }

    /**
     * Start servers by type
     * @param {Object} app - Application instance
     * @returns {Promise<void>} Promise that resolves when servers are started
     */
    static async startByType(app) {
        await AppUtil.loadLifecycle(app, app.enabled(Constants.LIFECYCLE.RELOAD));

        const shouldRunServers = app.startId
            ? app.startId !== Constants.RESERVED.MASTER
            : app.type && app.type !== Constants.RESERVED.ALL && app.type !== Constants.RESERVED.MASTER;

        if (shouldRunServers) {
            await starter.runServers(app);
        }
    }

    /**
     * Load default components for application
     * @param {Object} app - Application instance
     */
    static loadDefaultComponents(app) {
        const pofresh = require('../pofresh');

        try {
            if (app.serverType === Constants.RESERVED.MASTER) {
                AppUtil._loadMasterComponents(app, pofresh);
            } else {
                AppUtil._loadServerComponents(app, pofresh);
            }

            // Load monitor component for all server types
            app.load(pofresh.monitor, app.get('monitorConfig'));
        } catch (error) {
            logger.error('Failed to load default components:', error);
            throw error;
        }
    }

    /**
     * Load master-specific components
     * @private
     */
    static _loadMasterComponents(app, pofresh) {
        app.load(pofresh.master, app.get('masterConfig'));
    }

    /**
     * Load server-specific components
     * @private
     */
    static _loadServerComponents(app, pofresh) {
        app.load(pofresh.proxy, app.get('proxyConfig'));

        const currentServer = app.getCurServer();
        if (currentServer?.port) {
            app.load(pofresh.remote, app.get('remoteConfig'));
        }

        if (app.isFrontend()) {
            const frontendComponents = [
                { component: pofresh.connection, config: 'connectionConfig' },
                { component: pofresh.connector, config: 'connectorConfig' },
                { component: pofresh.session, config: 'sessionConfig' },
                { component: pofresh.pushScheduler, config: 'pushSchedulerConfig' }
            ];

            frontendComponents.forEach(({ component, config }) => {
                app.load(component, app.get(config));
            });
        }

        const backendComponents = [
            { component: pofresh.backendSession, config: 'backendSessionConfig' },
            { component: pofresh.channel, config: 'channelConfig' },
            { component: pofresh.server, config: 'serverConfig' }
        ];

        backendComponents.forEach(({ component, config }) => {
            app.load(component, app.get(config));
        });
    }

    /**
     * Stop components in series
     * @param {Array} comps - Component list
     * @param {boolean} force - Whether to stop component immediately
     * @returns {Promise<void>} Promise that resolves when all components are stopped
     */
    static async stopComps(comps, force) {
        const asyncStops = [];
        for (const comp of comps) {
            if (typeof comp.stop === 'function') {
                asyncStops.push(new Promise((resolve, reject) => {
                    if (utils.isAsyncFunction(comp.stop)) {
                        comp.stop(force).then(resolve).catch(reject);
                    } else {
                        comp.stop(force, err => err ? reject(err) : resolve());
                    }
                }));
            }
        }

        try {
            await Promise.all(asyncStops);
        } catch (error) {
            // Log error but continue with next component
            logger.warn('Error stopping components:', error);
        }
    }

    /**
     * Apply command to loaded components in series
     * @param {Array} comps - Loaded component list
     * @param {string} method - Component lifecycle method name (e.g., 'start', 'stop')
     * @returns {Promise<void>} Promise that resolves when all components are processed
     */
    static async optComponents(comps, method) {
        const funs = [];
        for (const comp of comps) {
            if (typeof comp[method] === 'function') {
                funs.push(new Promise((resolve, reject) => {
                    if (comp[method].constructor.name === 'AsyncFunction') {
                        comp[method]().then(resolve).catch(reject);
                    } else {
                        comp[method](err => err ? reject(err) : resolve());
                    }
                }));
            }
        }

        try {
            await Promise.all(funs);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Load server info from config/servers.json
     * @param {Object} app - Application instance
     */
    static loadServers(app) {
        app.loadConfigBaseApp(Constants.RESERVED.SERVERS, Constants.FILEPATH.SERVER);
        const servers = app.get(Constants.RESERVED.SERVERS);
        const serverMap = {};

        for (const [serverType, serverList] of Object.entries(servers)) {
            for (const server of serverList) {
                server.serverType = serverType;

                if (server[Constants.RESERVED.CLUSTER_COUNT]) {
                    utils.loadCluster(app, server, serverMap);
                } else {
                    serverMap[server.id] = server;
                }
            }
        }

        app.set(Constants.KEYWORDS.SERVER_MAP, serverMap);
    }

    /**
     * Load master info from config/master.json
     * @param {Object} app - Application instance
     */
    static loadMaster(app) {
        app.loadConfigBaseApp(Constants.RESERVED.MASTER, Constants.FILEPATH.MASTER);
        app.master = app.get(Constants.RESERVED.MASTER);
    }

    /**
     * Process server start command arguments
     * @param {Object} app - Application instance
     * @param {Object} args - Parsed command line arguments
     */
    static processArgs(app, args) {
        const master = app.getMaster();
        const {
            serverType = Constants.RESERVED.MASTER,
            id = master?.id || 'master-server-1',
            mode = Constants.RESERVED.CLUSTER,
            masterha = 'false',
            type = Constants.RESERVED.ALL,
            startId
        } = args;

        // Set application configuration
        const configs = [
            [Constants.RESERVED.MAIN, args.main],
            [Constants.RESERVED.SERVER_TYPE, serverType],
            [Constants.RESERVED.SERVER_ID, id],
            [Constants.RESERVED.MODE, mode],
            [Constants.RESERVED.TYPE, type]
        ];

        configs.forEach(([key, value]) => {
            app.set(key, value, true);
        });

        if (startId) {
            app.set(Constants.RESERVED.STARTID, startId, true);
        }

        // Set current server configuration
        AppUtil._setCurrentServer(app, args, serverType, masterha);
    }

    /**
     * Set current server configuration
     * @private
     */
    static _setCurrentServer(app, args, serverType, masterha) {
        let info = args;
        if (masterha === 'true') {
            app.master = args;
        } else if (serverType === Constants.RESERVED.MASTER) {
            info = app.getMaster();
        }
        app.set(Constants.RESERVED.CURRENT_SERVER, info, true);
    }

    /**
     * Setup environment configuration
     * @param {Object} app - Application instance
     * @param {Object} args - Parsed command line arguments
     */
    static setupEnv(app, args) {
        const env = args.env || process.env.NODE_ENV || Constants.RESERVED.ENV_DEV;
        app.set(Constants.RESERVED.ENV, env, true);
    }

    /**
     * Configure custom logger
     * @param {Object} app - Application instance
     */
    static configLogger(app) {
        app.configureLogger(require('pofresh-logger'));
    }

    /**
     * Parse command line arguments
     * @param {string[]} args - Command line arguments
     * @returns {Object} Parsed arguments map
     */
    static parseArgs(args) {
        const argsMap = {};
        let mainPos = 1;

        // Find the main script position (skip options starting with '--')
        while (args[mainPos] && args[mainPos].indexOf('--') > 0) {
            mainPos++;
        }
        argsMap.main = args[mainPos] || '';

        // Parse key-value pairs
        for (let i = mainPos + 1; i < args.length; i++) {
            const arg = args[i];
            const separatorIndex = arg.indexOf('=');

            if (separatorIndex === -1) continue;

            const key = arg.slice(0, separatorIndex);
            let value = arg.slice(separatorIndex + 1);

            // Convert numeric strings to numbers (excluding decimals)
            if (!Number.isNaN(Number(value)) && !value.includes('.')) {
                value = Number(value);
            }

            argsMap[key] = value;
        }

        return argsMap;
    }

    /**
     * Load lifecycle file and optionally watch for changes
     * @param {Object} app - Application instance
     * @param {boolean} reload - Whether to watch for file changes
     * @returns {Promise<void>} Promise that resolves when lifecycle is loaded
     */
    static async loadLifecycle(app, reload = false) {
        const filePath = path.join(
            app.getBase(),
            Constants.FILEPATH.SERVER_DIR,
            app.serverType,
            Constants.FILEPATH.LIFECYCLE
        );

        try {
            // Use async file existence check
            if (existsSync(filePath)) {
                return;
            }

            const lifecycle = require(filePath);

            for (const [key, value] of Object.entries(lifecycle)) {
                if (typeof value === 'function') {
                    app.lifecycleCbs[key] = value;
                } else {
                    logger.warn('Invalid lifecycle function format in %s for key: %s', filePath, key);
                }
            }

            if (reload) {
                AppUtil._watchLifecycleFile(app, filePath);
            }

            logger.debug('Lifecycle file loaded successfully: %s', filePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.debug('Lifecycle file not found: %s', filePath);
                return; // File doesn't exist, which is acceptable
            }
            logger.error('Failed to load lifecycle file %s:', filePath, error);
            throw error;
        }
    }

    /**
     * Watch lifecycle file for changes
     * @private
     */
    static _watchLifecycleFile(app, filePath, reload) {
        fs.watch(filePath, async event => {
            if (event === 'change') {
                try {
                    // Clear require cache for hot reload
                    delete require.cache[require.resolve(filePath)];
                    await AppUtil.loadLifecycle(app, false); // Reload without watching again
                    logger.info('Lifecycle file reloaded: %s', filePath);
                } catch (error) {
                    logger.error('Failed to reload lifecycle file %s:', filePath, error);
                }
            }
        });
    }
}

// Export all methods (now all async/await based)
module.exports = AppUtil;
