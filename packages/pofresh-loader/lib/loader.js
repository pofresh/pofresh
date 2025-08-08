/**
 * Loader Module
 */

const fs = require('fs');
const path = require('path');

const logger = require('pofresh-logger').getLogger('loader', __filename);

/**
 * Load modules under the path.
 * If the module is a function, loader would treat it as a factory function
 * and invoke it with the context parameter to get a instance of the module.
 * Else loader would just require the module.
 * Module instance can specify a name property and it would use file name as
 * the default name if there is no name property. All loaded modules under the
 * path would be add to an empty root object with the name as the key.
 *
 * @param  {String} mpath    the path of modules. Load all the files under the
 *                           path, but *not* recursively if the path contain
 *                           any sub-directory.
 * @param  {Object} context  the context parameter that would be pass to the
 *                           module factory function.
 * @param {Boolean} isReload if true, loader would reload the module.
 * @return {Object}          module that has loaded.
 * @throws {Error} when path is invalid or not accessible
 */
module.exports.load = (mpath, context, isReload = false) => {
    if (!mpath || typeof mpath !== 'string') {
        throw new Error('path should be a non-empty string.');
    }

    let resolvedPath, stats;

    try {
        resolvedPath = fs.realpathSync(mpath);
    } catch (err) {
        throw new Error(`Failed to resolve path "${mpath}": ${err.message}`);
    }

    try {
        stats = fs.statSync(resolvedPath);
    } catch (err) {
        throw new Error(`Failed to access path "${resolvedPath}": ${err.message}`);
    }

    if (!stats.isDirectory()) {
        throw new Error(`Path "${resolvedPath}" is not a directory.`);
    }

    return loadPath(resolvedPath, context, isReload);
};

/**
 * Load all JavaScript files from a directory
 * @param {string} dirPath - Directory path to load from
 * @param {Object} context - Context to pass to factory functions
 * @param {boolean} isReload - Whether to reload cached modules
 * @returns {Object} Object containing loaded modules
 */
function loadPath(dirPath, context, isReload = false) {
    let files;
    try {
        files = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
        throw new Error(`Failed to read directory "${dirPath}": ${err.message}`);
    }

    if (files.length === 0) {
        logger.warn(`Directory is empty: ${dirPath}`);
        return {};
    }

    const result = {};
    const errors = [];

    // Load all files synchronously
    for (const dirent of files) {
        if (!(dirent.isFile() && dirent.name.endsWith('.js'))) {
            continue;
        }

        const filePath = path.join(dirPath, dirent.name);
        processModuleFile(filePath, dirent, context, isReload, result, errors);
    }

    // Log errors but don't throw to allow partial loading
    if (errors.length > 0) {
        logger.warn('Some modules failed to load:', errors);
    }

    return result;
}

/**
 * Process a single module file
 * @param {string} filePath - Path to the file
 * @param {fs.Dirent} dirent - Directory entry
 * @param {Object} context - Context to pass to factory functions
 * @param {boolean} isReload - Whether to reload cached modules
 * @param {Object} result - Result object to populate
 * @param {Array} errors - Array to collect errors
 */
function processModuleFile(filePath, dirent, context, isReload, result, errors) {
    let module;

    try {
        module = loadFile(filePath, context, isReload);
    } catch (err) {
        errors.push(`Failed to load module "${filePath}": ${err.message}`);
        return;
    }

    if (module !== null && module !== undefined) {
        const moduleName = module.name || path.basename(dirent.name, '.js');
        if (result[moduleName]) {
            logger.warn(`Module name conflict: "${moduleName}" already exists, overwriting.`);
        }
        result[moduleName] = module;
    }
}

/**
 * Load a single JavaScript file
 * @param {string} filePath - Path to the file to load
 * @param {Object} context - Context to pass to factory functions
 * @param {boolean} isReload - Whether to reload cached modules
 * @returns {*} The loaded module or result of factory function
 */
function loadFile(filePath, context, isReload = false) {
    const module = requireUncached(filePath, isReload);

    if (module === null || module === undefined) {
        return null;
    }

    if (typeof module === 'function') {
        // if the module provides a factory function
        // then invoke it to get an instance
        try {
            return module(context);
        } catch (err) {
            throw new Error(`Factory function failed for module "${filePath}": ${err.message}`);
        }
    }

    return module;
}

/**
 * Require a module with optional cache clearing
 * @param {string} modulePath - Path to the module to require
 * @param {boolean} isReload - Whether to clear the module from cache first
 * @returns {*} The required module
 */
function requireUncached(modulePath, isReload = false) {
    let resolvedPath;
    try {
        resolvedPath = require.resolve(modulePath);
    } catch (err) {
        throw new Error(`Cannot resolve module "${modulePath}": ${err.message}`);
    }

    if (isReload && require.cache[resolvedPath]) {
        delete require.cache[resolvedPath];
    }

    try {
        return require(modulePath);
    } catch (err) {
        throw new Error(`Failed to require module "${modulePath}": ${err.message}`);
    }
}
