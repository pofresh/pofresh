/**
 * Constants for Pofresh framework
 * Contains keywords, file paths, directories, reserved words, commands, platforms,
 * lifecycle hooks, signals, and time constants used throughout the framework.
 */

/**
 * Keyword constants used internally by the framework
 * @type {Object<string, string>}
 */
const KEYWORDS = {
    BEFORE_FILTER: '__befores__',
    AFTER_FILTER: '__afters__',
    GLOBAL_BEFORE_FILTER: '__globalBefores__',
    GLOBAL_AFTER_FILTER: '__globalAfters__',
    ROUTE: '__routes__',
    MODULE: '__modules__',
    SERVER_MAP: '__serverMap__',
    RPC_BEFORE_FILTER: '__rpcBefores__',
    RPC_AFTER_FILTER: '__rpcAfters__',
    MASTER_WATCHER: '__masterwatcher__',
    MONITOR_WATCHER: '__monitorwatcher__'
};

/**
 * File path constants for configuration and application files
 * @type {Object<string, string>}
 */
const FILEPATH = {
    MASTER: '/config/master.json',
    SERVER: '/config/servers.json',
    CRON: '/config/crons.json',
    LOG: '/config/log4js.json',
    SERVER_PROTOS: '/config/serverProtos.json',
    CLIENT_PROTOS: '/config/clientProtos.json',
    MASTER_HA: '/config/masterha.json',
    LIFECYCLE: '/lifecycle.js',
    SERVER_DIR: '/app/servers/',
    CONFIG_DIR: '/config'
};

/**
 * Directory constants for different types of files and components
 * @type {Object<string, string>}
 */
const DIR = {
    HANDLER: 'handler',
    REMOTE: 'remote',
    CRON: 'cron',
    LOG: 'logs',
    SCRIPT: 'scripts',
    EVENT: 'events',
    COMPONENT: 'components'
};

/**
 * Reserved words used for configuration keys and system properties
 * @type {Object<string, string>}
 */
const RESERVED = {
    BASE: 'base',
    MAIN: 'main',
    MASTER: 'master',
    SERVERS: 'servers',
    ENV: 'env',
    CPU: 'cpu',
    ENV_DEV: 'development',
    ENV_PRO: 'production',
    ALL: 'all',
    SERVER_TYPE: 'serverType',
    SERVER_ID: 'serverId',
    CURRENT_SERVER: 'curServer',
    MODE: 'mode',
    TYPE: 'type',
    CLUSTER: 'clusters',
    STAND_ALONE: 'stand-alone',
    START: 'start',
    AFTER_START: 'afterStart',
    CRONS: 'crons',
    ERROR_HANDLER: 'errorHandler',
    GLOBAL_ERROR_HANDLER: 'globalErrorHandler',
    AUTO_RESTART: 'auto-restart',
    RESTART_FORCE: 'restart-force',
    CLUSTER_COUNT: 'clusterCount',
    CLUSTER_PREFIX: 'cluster-server-',
    CLUSTER_SIGNAL: '++',
    RPC_ERROR_HANDLER: 'rpcErrorHandler',
    SERVER: 'server',
    CLIENT: 'client',
    STARTID: 'startId',
    STOP_SERVERS: 'stop_servers',
    SSH_CONFIG_PARAMS: 'ssh_config_params'
};

/**
 * Command constants for system operations
 * @type {Object<string, string>}
 */
const COMMAND = {
    TASKSET: 'taskset',
    KILL: 'kill',
    TASKKILL: 'taskkill',
    SSH: 'ssh'
};

/**
 * Platform constants for operating system detection
 * @type {Object<string, string>}
 */
const PLATFORM = {
    WIN: 'win32',
    LINUX: 'linux'
};

/**
 * Lifecycle hook constants for application lifecycle management
 * @type {Object<string, string>}
 */
const LIFECYCLE = {
    RELOAD: 'lifecycle_reload',
    BEFORE_STARTUP: 'beforeStartup',
    BEFORE_SHUTDOWN: 'beforeShutdown',
    AFTER_STARTUP: 'afterStartup',
    AFTER_STARTALL: 'afterStartAll'
};

/**
 * Signal constants for success/failure indicators
 * @type {Object<number, number>}
 */
const SIGNAL = {
    FAIL: 0,
    OK: 1
};

/**
 * Time constants for various timeouts and durations in milliseconds
 * @type {Object<string, number>}
 */
const TIME = {
    TIME_WAIT_STOP: 3 * 1000,
    TIME_WAIT_KILL: 5 * 1000,
    TIME_WAIT_RESTART: 5 * 1000,
    TIME_WAIT_COUNTDOWN: 10 * 1000,
    TIME_WAIT_MASTER_KILL: 2 * 60 * 1000,
    TIME_WAIT_MONITOR_KILL: 2 * 1000,
    TIME_WAIT_PING: 30 * 1000,
    TIME_WAIT_MAX_PING: 5 * 60 * 1000,
    DEFAULT_UDP_HEARTBEAT_TIME: 20 * 1000,
    DEFAULT_UDP_HEARTBEAT_TIMEOUT: 100 * 1000,
    DEFAULT_MQTT_HEARTBEAT_TIMEOUT: 90 * 1000
};

/**
 * Helper function to validate a reserved constant exists
 * @param {string} key - The key to validate
 * @returns {boolean} True if the key exists in RESERVED
 */
function isValidReservedKey(key) {
    return Object.hasOwn(RESERVED, key);
}

/**
 * Helper function to get all file path constants
 * @returns {Object<string, string>} All file path constants
 */
function getAllFilePaths() {
    return { ...FILEPATH };
}

/**
 * Helper function to get all time constants
 * @returns {Object<string, number>} All time constants
 */
function getAllTimeConstants() {
    return { ...TIME };
}

module.exports = {
    KEYWORDS,
    FILEPATH,
    DIR,
    RESERVED,
    COMMAND,
    PLATFORM,
    LIFECYCLE,
    SIGNAL,
    TIME,
    isValidReservedKey,
    getAllFilePaths,
    getAllTimeConstants
};
