const { promisify } = require('util');
const utils = require('./utils');
const path = require('path');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
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
            // If starter.runServers supports promises, await it
            if (starter.runServers.constructor.name === 'AsyncFunction') {
                await starter.runServers(app);
            } else {
                starter.runServers(app);
            }
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
        for (const comp of comps) {
            if (typeof comp.stop === 'function') {
                try {
                    await new Promise((resolve) => {
                        comp.stop(force, () => {
                            // Ignore any error and continue with next component
                            resolve();
                        });
                    });
                } catch (error) {
                    // Log error but continue with next component
                    logger.warn('Error stopping component:', error);
                }
            }
        }
    }
    


    /**
     * Apply command to loaded components in series
     * @param {Array} comps - Loaded component list
     * @param {string} method - Component lifecycle method name (e.g., 'start', 'stop')
     * @returns {Promise<void>} Promise that resolves when all components are processed
     */
    static async optComponents(comps, method) {
        for (const comp of comps) {
            if (typeof comp[method] === 'function') {
                await new Promise((resolve, reject) => {
                    comp[method]((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
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
        const serverType = args.serverType || Constants.RESERVED.MASTER;
        const master = app.getMaster();
        const serverId = args.id || master?.id || 'master-server-1';
        const mode = args.mode || Constants.RESERVED.CLUSTER;
        const masterha = args.masterha || 'false';
        const type = args.type || Constants.RESERVED.ALL;
        const { startId } = args;

        // Set application configuration
        const configs = [
            [Constants.RESERVED.MAIN, args.main],
            [Constants.RESERVED.SERVER_TYPE, serverType],
            [Constants.RESERVED.SERVER_ID, serverId],
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
            await fsPromises.access(filePath, fs.constants.F_OK);
            
            // Clear require cache for hot reload
            delete require.cache[require.resolve(filePath)];
            
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
    static _watchLifecycleFile(app, filePath) {
        fs.watch(filePath, async (event) => {
            if (event === 'change') {
                try {
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
module.exports.AppUtil = AppUtil;
module.exports.defaultConfiguration = AppUtil.defaultConfiguration;
module.exports.startByType = AppUtil.startByType;
module.exports.loadDefaultComponents = AppUtil.loadDefaultComponents;
module.exports.stopComps = AppUtil.stopComps;
module.exports.optComponents = AppUtil.optComponents;
module.exports.loadServers = AppUtil.loadServers;
module.exports.loadMaster = AppUtil.loadMaster;
module.exports.processArgs = AppUtil.processArgs;
module.exports.setupEnv = AppUtil.setupEnv;
module.exports.configLogger = AppUtil.configLogger;
module.exports.parseArgs = AppUtil.parseArgs;
module.exports.loadLifecycle = AppUtil.loadLifecycle;
