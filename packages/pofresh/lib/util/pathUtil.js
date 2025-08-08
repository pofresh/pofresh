const fs = require('fs');
const path = require('path');
const Constants = require('./constants');
const exp = module.exports;

/**
 * Get system remote service path
 *
 * @param  {String} role server role: frontend, backend
 * @return {String}      path string if the path exist else null
 */
exp.getSysRemotePath = role => {
    const p = path.join(__dirname, '/../common/remote/', role);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get user remote service path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
exp.getUserRemotePath = (appBase, serverType) => {
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.REMOTE);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get user remote cron path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
exp.getCronPath = (appBase, serverType) => {
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.CRON);
    return fs.existsSync(p) ? p : null;
};

/**
 * Compose remote path record
 *
 * @param  {String} namespace  remote path namespace, such as: 'sys', 'user'
 * @param  {String} serverType
 * @param  {String} path       remote service source path
 * @return {Object}            remote path record
 */
exp.remotePathRecord = (namespace, serverType, path) => ({
    namespace,
    serverType,
    path
});

/**
 * Get handler path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
exp.getHandlerPath = (appBase, serverType) => {
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.HANDLER);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get admin script root path.
 *
 * @param  {String} appBase application base path
 * @return {String}         script path string
 */
exp.getScriptPath = appBase => path.join(appBase, Constants.DIR.SCRIPT);

/**
 * Get logs path.
 *
 * @param  {String} appBase application base path
 * @return {String}         logs path string
 */
exp.getLogPath = appBase => path.join(appBase, Constants.DIR.LOG);
