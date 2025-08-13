const fs = require('fs');
const path = require('path');
const Constants = require('./constants.js');

/**
 * Path utilities for file and directory operations
 * Provides methods to get various paths used in the Pofresh framework
 */

/**
 * Get system remote service path for a given role
 * @param {string} role - Server role (frontend, backend)
 * @returns {string|null} Path string if it exists, otherwise null
 */
function getSysRemotePath(role) {
    const p = path.join(__dirname, '/../common/remote/', role);
    try {
        if (fs.existsSync(p)) {
            return p;
        }
    } catch (_error) {
        // Silently ignore errors, return null
    }
    return null;
}

/**
 * Get user remote service path for a given server type
 * @param {string} appBase - Application base path
 * @param {string} serverType - Server type
 * @returns {string|null} Path string if it exists, otherwise null
 */
function getUserRemotePath(appBase, serverType) {
    const p = path.join(appBase, Constants.FILEPATH.SERVER_DIR, serverType, Constants.DIR.REMOTE);
    try {
        if (fs.existsSync(p)) {
            return p;
        }
    } catch (_error) {
        // Silently ignore errors, return null
    }
    return null;
}

/**
 * Get user remote cron path for a given server type
 * @param {string} appBase - Application base path
 * @param {string} serverType - Server type
 * @returns {string|null} Path string if it exists, otherwise null
 */
function getCronPath(appBase, serverType) {
    const p = path.join(appBase, Constants.FILEPATH.SERVER_DIR, serverType, Constants.DIR.CRON);
    try {
        if (fs.existsSync(p)) {
            return p;
        }
    } catch (_error) {
        // Silently ignore errors, return null
    }
    return null;
}

/**
 * Create a remote path record object
 * @param {string} namespace - Remote path namespace ('sys', 'user')
 * @param {string} serverType - Server type
 * @param {string} filePath - Remote service source path
 * @returns {Object} Remote path record object
 */
function remotePathRecord(namespace, serverType, filePath) {
    return {
        namespace,
        serverType,
        path: filePath
    };
}

/**
 * Get handler path for a given server type
 * @param {string} appBase - Application base path
 * @param {string} serverType - Server type
 * @returns {string|null} Path string if it exists, otherwise null
 */
function getHandlerPath(appBase, serverType) {
    const p = path.join(appBase, Constants.FILEPATH.SERVER_DIR, serverType, Constants.DIR.HANDLER);
    try {
        if (fs.existsSync(p)) {
            return p;
        }
    } catch (_error) {
        // Silently ignore errors, return null
    }
    return null;
}

/**
 * Get admin script root path
 * @param {string} appBase - Application base path
 * @returns {string} Script path string
 */
function getScriptPath(appBase) {
    return path.join(appBase, Constants.DIR.SCRIPT);
}

/**
 * Get logs path
 * @param {string} appBase - Application base path
 * @returns {string} Logs path string
 */
function getLogPath(appBase) {
    return path.join(appBase, Constants.DIR.LOG);
}

/**
 * Validate a directory path exists and is accessible
 * @param {string} dirPath - Directory path to validate
 * @returns {Promise<boolean>} True if directory exists and is accessible
 */
async function validateDirectory(dirPath) {
    try {
        await fs.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

/**
 * Check if a path is absolute
 * @param {string} filePath - File path to check
 * @returns {boolean} True if path is absolute
 */
function isAbsolute(filePath) {
    return path.isAbsolute(filePath);
}

/**
 * Resolve relative path against base
 * @param {string} base - Base path
 * @param {string} relative - Relative path
 * @returns {string} Resolved absolute path
 */
function resolvePath(base, relative) {
    return path.resolve(base, relative);
}

/**
 * Get directory name from path
 * @param {string} filePath - File path
 * @returns {string} Directory name
 */
function getDirectoryName(filePath) {
    return path.dirname(filePath);
}

/**
 * Get file name from path
 * @param {string} filePath - File path
 * @returns {string} File name
 */
function getFileName(filePath) {
    return path.basename(filePath);
}

/**
 * Get file extension from path
 * @param {string} filePath - File path
 * @returns {string} File extension (with dot)
 */
function getFileExtension(filePath) {
    return path.extname(filePath);
}

module.exports = {
    getSysRemotePath,
    getUserRemotePath,
    getCronPath,
    remotePathRecord,
    getHandlerPath,
    getScriptPath,
    getLogPath,
    validateDirectory,
    ensureDirectory,
    isAbsolute,
    resolvePath,
    getDirectoryName,
    getFileName,
    getFileExtension
};
