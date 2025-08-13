/*!
 * pofresh
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
const fs = require('fs');
const path = require('path');
const application = require('./application');
const Package = require('../package');

/**
 * Pofresh framework main module
 * @namespace pofresh
 */
class PofreshFramework {
    constructor() {
        this.app = null;
        this.version = Package.version;
        this.events = require('./util/events');

        // Initialize lazy-loaded modules
        this.components = {};
        this.filters = {};
        this.rpcFilters = {};
        this.connectors = {};
        this.pushSchedulers = {};

        this._initializeConnectors();
        this._initializePushSchedulers();
        this._autoLoadModules();
    }

    /**
     * Initialize connectors with lazy loading
     * @private
     */
    _initializeConnectors() {
        const connectorMap = {
            sioconnector: './connectors/sioconnector',
            hybridconnector: './connectors/hybridconnector',
            udpconnector: './connectors/udpconnector',
            mqttconnector: './connectors/mqttconnector'
        };

        Object.entries(connectorMap).forEach(([name, modulePath]) => {
            Object.defineProperty(this.connectors, name, {
                get: () => this._lazyLoad(modulePath),
                enumerable: true,
                configurable: true
            });
        });
    }

    /**
     * Initialize push schedulers with lazy loading
     * @private
     */
    _initializePushSchedulers() {
        const schedulerMap = {
            direct: './pushSchedulers/direct',
            buffer: './pushSchedulers/buffer'
        };

        Object.entries(schedulerMap).forEach(([name, modulePath]) => {
            Object.defineProperty(this.pushSchedulers, name, {
                get: () => this._lazyLoad(modulePath),
                enumerable: true,
                configurable: true
            });
        });
    }

    /**
     * Create a pofresh application
     * @param {Object} [opts={}] - Application options
     * @returns {Application} The initialized application instance
     * @public
     */
    createApp(opts = {}) {
        try {
            // Provide default base path if not specified
            if (!opts.base && !require.main?.filename) {
                opts.base = process.cwd();
            }

            const app = application;
            app.init(opts);
            this.app = app;
            return app;
        } catch (error) {
            throw new Error(`Failed to create pofresh application: ${error.message}`);
        }
    }

    /**
     * Auto-load modules from specified directories
     * @private
     */
    _autoLoadModules() {
        // Load components
        this._loadModulesFromDirectory('./components', this.components, true);

        // Load handler filters
        this._loadModulesFromDirectory('./filters/handler', this.filters, true);

        // Load RPC filters
        this._loadModulesFromDirectory('./filters/rpc', this.rpcFilters, false);
    }

    /**
     * Load modules from a directory with lazy loading
     * @param {string} dirPath - Directory path relative to __dirname
     * @param {Object} target - Target object to attach modules
     * @param {boolean} attachToRoot - Whether to also attach to root object
     * @private
     */
    _loadModulesFromDirectory(dirPath, target, attachToRoot = false) {
        try {
            const fullPath = path.join(__dirname, dirPath);
            if (!fs.existsSync(fullPath)) {
                return;
            }

            const files = fs.readdirSync(fullPath).filter(file => /\.js$/.test(file));

            files.forEach(filename => {
                const name = path.basename(filename, '.js');
                const modulePath = `${dirPath}/${name}`;

                // Define getter for target object
                Object.defineProperty(target, name, {
                    get: () => this._lazyLoad(modulePath),
                    enumerable: true,
                    configurable: true
                });

                // Also attach to root if requested
                if (attachToRoot) {
                    Object.defineProperty(this, name, {
                        get: () => this._lazyLoad(modulePath),
                        enumerable: true,
                        configurable: true
                    });
                }
            });
        } catch (_error) {}
    }

    /**
     * Lazy load a module
     * @param {string} modulePath - Module path to load
     * @returns {*} The loaded module
     * @private
     */
    _lazyLoad(modulePath) {
        try {
            // Handle relative paths by resolving them relative to __dirname
            if (modulePath.startsWith('./')) {
                return require(path.join(__dirname, modulePath.substring(2)));
            }
            return require(modulePath);
        } catch (error) {
            throw new Error(`Failed to load module ${modulePath}: ${error.message}`);
        }
    }
}

// Create and export singleton instance
const pofresh = new PofreshFramework();

module.exports = pofresh;
