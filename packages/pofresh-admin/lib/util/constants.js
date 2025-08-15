/**
 * pofresh-admin Constants Module
 * Enhanced with comprehensive configuration and validation
 */

const Constants = module.exports = {
    // Default connection parameters
    DEFAULT_PARAM: {
        KEEPALIVE: 5 * 1000,           // Keep alive interval in ms
        TIMEOUT: 5 * 1000,             // Connection timeout in ms
        RECONNECT_DELAY: 1000,        // Initial reconnect delay in ms
        RECONNECT_DELAY_MAX: 5 * 1000, // Maximum reconnect delay in ms
        CONNECTION_POOL_SIZE: 10,      // Connection pool size
        MAX_MESSAGE_SIZE: 1024 * 1024, // Maximum message size (1MB)
        HEARTBEAT_INTERVAL: 30 * 1000  // Heartbeat interval in ms
    },

    // Process types
    TYPE_CLIENT: 'client',
    TYPE_MONITOR: 'monitor',
    TYPE_MASTER: 'master',

    // Message types
    MESSAGE_TYPE: {
        REQUEST: 'request',
        RESPONSE: 'response',
        NOTIFY: 'notify',
        ERROR: 'error'
    },

    // Module types
    MODULE_TYPE: {
        PULL: 'pull',    // Master pulls data from monitor
        PUSH: 'push'     // Monitor pushes data to master
    },

    // Protocol types
    PROTOCOL: {
        SOCKET_IO: 'socketio',
        MQTT: 'mqtt',
        TCP: 'tcp',
        WS: 'websocket'
    },

    // Authentication levels
    AUTH_LEVEL: {
        ADMIN: 1,    // Full admin permissions
        MONITOR: 2,  // Monitor permissions
        USER: 3      // Limited user permissions
    },

    // Error codes
    ERROR_CODE: {
        SUCCESS: 0,
        AUTH_FAILED: 1001,
        CONNECTION_FAILED: 1002,
        TIMEOUT: 1003,
        INVALID_MESSAGE: 1004,
        MODULE_NOT_FOUND: 1005,
        SERVER_NOT_FOUND: 1006
    },

    // Event types
    EVENT: {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        RECONNECT: 'reconnect',
        ERROR: 'error',
        REGISTER: 'register',
        MESSAGE: 'message'
    },

    // Status codes
    STATUS: {
        ONLINE: 'online',
        OFFLINE: 'offline',
        CONNECTING: 'connecting',
        DISCONNECTED: 'disconnected'
    }
};

/**
 * Validate configuration parameters
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result {valid: boolean, errors: Array}
 */
Constants.validateConfig = (config) => {
    const errors = [];
    
    if (!config || typeof config !== 'object') {
        errors.push('Configuration must be an object');
        return { valid: false, errors };
    }

    // Validate timeout parameters
    if (config.timeout !== undefined) {
        if (typeof config.timeout !== 'number' || config.timeout <= 0) {
            errors.push('Timeout must be a positive number');
        }
    }

    // Validate keepalive
    if (config.keepalive !== undefined) {
        if (typeof config.keepalive !== 'number' || config.keepalive <= 0) {
            errors.push('Keepalive must be a positive number');
        }
    }

    // Validate connection pool size
    if (config.poolSize !== undefined) {
        if (typeof config.poolSize !== 'number' || config.poolSize <= 0) {
            errors.push('Pool size must be a positive number');
        }
    }

    // Validate message size
    if (config.maxMessageSize !== undefined) {
        if (typeof config.maxMessageSize !== 'number' || config.maxMessageSize <= 0) {
            errors.push('Max message size must be a positive number');
        }
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Get default configuration
 * @returns {Object} Default configuration
 */
Constants.getDefaultConfig = () => {
    return {
        timeout: Constants.DEFAULT_PARAM.TIMEOUT,
        keepalive: Constants.DEFAULT_PARAM.KEEPALIVE,
        reconnectDelay: Constants.DEFAULT_PARAM.RECONNECT_DELAY,
        reconnectDelayMax: Constants.DEFAULT_PARAM.RECONNECT_DELAY_MAX,
        poolSize: Constants.DEFAULT_PARAM.CONNECTION_POOL_SIZE,
        maxMessageSize: Constants.DEFAULT_PARAM.MAX_MESSAGE_SIZE,
        heartbeatInterval: Constants.DEFAULT_PARAM.HEARTBEAT_INTERVAL
    };
};

/**
 * Check if process type is valid
 * @param {string} type - Process type
 * @returns {boolean} True if valid
 */
Constants.isValidProcessType = (type) => {
    return [
        Constants.TYPE_CLIENT,
        Constants.TYPE_MONITOR,
        Constants.TYPE_MASTER
    ].includes(type);
};

/**
 * Check if message type is valid
 * @param {string} type - Message type
 * @returns {boolean} True if valid
 */
Constants.isValidMessageType = (type) => {
    return Object.values(Constants.MESSAGE_TYPE).includes(type);
};

/**
 * Check if protocol type is valid
 * @param {string} protocol - Protocol type
 * @returns {boolean} True if valid
 */
Constants.isValidProtocol = (protocol) => {
    return Object.values(Constants.PROTOCOL).includes(protocol);
};

/**
 * Check if auth level is valid
 * @param {number} level - Auth level
 * @returns {boolean} True if valid
 */
Constants.isValidAuthLevel = (level) => {
    return Object.values(Constants.AUTH_LEVEL).includes(level);
};
