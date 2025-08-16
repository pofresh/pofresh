const os = require('os');
const admin = require('pofresh-admin');
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

    for (const key in _modules) {
        const record = _modules[key];
        const moduleId = record.moduleId || record.module?.moduleId;
        const module =
            typeof record.module === 'function' ? record.module(record.opts, consoleService) : record.module;

        if (!moduleId) {
            logger.warn('Ignoring module at %d: missing moduleId', key);
            return;
        }

        consoleService.register(moduleId, module);
        self.modules.push(module);
    }
}

/**
 * Start modules by invoking their start lifecycle methods
 * @param {Array} modules - Array of modules to start
 */
async function startModules(modules) {
    if (!modules) {
        return;
    }

    const startFns = [];
    for (const module of modules) {
        if (module && typeof module.start !== 'function') {
            continue;
        }

        startFns.push(new Promise((resolve, reject) => module.start().then(resolve).catch(reject)));
    }

    try {
        await Promise.all(startFns);
    } catch (error) {
        throw error;
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

module.exports = {
    loadModules,
    startModules,
    registerDefaultModules
};
