const os = require('os');
const admin = require('pofresh-admin');
const utils = require('./utils.js');
const Constants = require('./constants.js');
const pathUtil = require('./pathUtil.js');
const starter = require('../master/starter.js');
const logger = require('pofresh-logger').getLogger('pofresh', 'moduleUtil.js');

/**
 * Module utilities for loading and managing admin modules
 */

/**
 * Load admin modules into the console service
 * @param {Object} self - Self context
 * @param {Object} consoleService - Console service instance
 * @throws {Error} If module loading fails
 */
function loadModules(self, consoleService) {
    // Load app register modules
    const _modules = self.app.get(Constants.KEYWORDS.MODULE);

    if (!_modules) {
        return;
    }

    const modules = Object.values(_modules);

    modules.forEach((record, index) => {
        try {
            const moduleId = record.moduleId || record.module?.moduleId;
            const module =
                typeof record.module === 'function' ? record.module(record.opts, consoleService) : record.module;

            if (!moduleId) {
                logger.warn('Ignoring module at index %d: missing moduleId', index);
                return;
            }

            consoleService.register(moduleId, module);
            self.modules.push(module);
        } catch (error) {
            logger.error('Failed to load module at index %d:', index, error);
            throw error;
        }
    });
}

/**
 * Start modules by invoking their start lifecycle methods
 * @param {Array} modules - Array of modules to start
 * @param {function} callback - Completion callback
 */
async function startModules(modules, callback) {
    if (!modules) {
        utils.invokeCallback(callback, null);
        return;
    }

    try {
        await startModule(null, modules, 0, callback);
    } catch (error) {
        utils.invokeCallback(callback, error);
    }
}

/**
 * Register default system admin modules
 * @param {boolean} isMaster - Whether this is a master server
 * @param {Object} app - Application instance
 * @param {boolean} closeWatcher - Whether to close watcher
 */
function registerDefaultModules(isMaster, app, closeWatcher = false) {
    try {
        if (!closeWatcher) {
            if (isMaster) {
                app.registerAdmin(require('../modules/masterwatcher.js'), { app });
            } else {
                app.registerAdmin(require('../modules/monitorwatcher.js'), { app });
            }
        }

        app.registerAdmin(admin.modules.watchServer, { app });
        app.registerAdmin(require('../modules/console.js'), { app, starter });

        if (app.enabled('systemMonitor')) {
            if (os.platform() !== Constants.PLATFORM.WIN) {
                app.registerAdmin(admin.modules.systemInfo);
                app.registerAdmin(admin.modules.nodeInfo);
                app.registerAdmin(admin.modules.profiler);
            }

            app.registerAdmin(admin.modules.monitorLog, {
                path: pathUtil.getLogPath(app.getBase())
            });

            app.registerAdmin(admin.modules.scripts, {
                app,
                path: pathUtil.getScriptPath(app.getBase())
            });
        }
    } catch (error) {
        logger.error('Failed to register default modules:', error);
        throw error;
    }
}

/**
 * Internal function to start modules recursively
 * @private
 */
async function startModule(err, modules, index, callback) {
    if (err || index >= modules.length) {
        utils.invokeCallback(callback, err);
        return;
    }

    const module = modules[index];
    if (module && typeof module.start === 'function') {
        try {
            await new Promise((resolve, reject) => {
                module.start(error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            startModule(null, modules, index + 1, callback);
        } catch (error) {
            logger.error('Failed to start module at index %d:', index, error);
            startModule(error, modules, index + 1, callback);
        }
    } else {
        startModule(null, modules, index + 1, callback);
    }
}

module.exports = {
    loadModules,
    startModules,
    registerDefaultModules,
    startModule
};
