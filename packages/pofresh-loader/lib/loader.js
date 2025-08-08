/**
 * Loader Module
 */

const fs = require('fs');
const path = require('path');

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

    let resolvedPath;
    try {
        resolvedPath = fs.realpathSync(mpath);
    } catch (err) {
        throw new Error(`Failed to resolve path "${mpath}": ${err.message}`);
    }

    let stats;
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

function loadPath(dirPath, context, isReload = false) {
    let files;
    try {
        files = fs.readdirSync(dirPath);
    } catch (err) {
        throw new Error(`Failed to read directory "${dirPath}": ${err.message}`);
    }

    if (files.length === 0) {
        console.warn('Directory is empty:', dirPath);
        return {};
    }

    const result = {};
    const errors = [];

    for (const fileName of files) {
        const filePath = path.join(dirPath, fileName);

        // Check if it's a JavaScript file without additional stat call
        if (!fileName.endsWith('.js')) {
            continue;
        }

        let stats;
        try {
            stats = fs.statSync(filePath);
        } catch (err) {
            errors.push(`Failed to stat file "${filePath}": ${err.message}`);
            continue;
        }

        if (!stats.isFile()) {
            continue;
        }

        try {
            const module = loadFile(filePath, context, isReload);
            if (module) {
                const moduleName = module.name || path.basename(fileName, '.js');
                if (result[moduleName]) {
                    console.warn(`Module name conflict: "${moduleName}" already exists, overwriting.`);
                }
                result[moduleName] = module;
            }
        } catch (err) {
            errors.push(`Failed to load module "${filePath}": ${err.message}`);
        }
    }

    // Log errors but don't throw to allow partial loading
    if (errors.length > 0) {
        console.warn('Some modules failed to load:', errors);
    }

    return result;
}

function loadFile(filePath, context, isReload = false) {
    const module = requireUncached(filePath, isReload);

    if (module === null || module === undefined) {
        return null;
    }

    if (typeof module === 'function') {
        // if the module provides a factory function
        // then invoke it to get an instance
        try {
            const instance = module(context);
            return instance;
        } catch (err) {
            throw new Error(`Factory function failed for module "${filePath}": ${err.message}`);
        }
    }

    return module;
}

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
