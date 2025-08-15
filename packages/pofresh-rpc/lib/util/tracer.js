/**
 * RPC tracing utility for distributed system debugging
 */

const { v4: uuid } = require('uuid');

/**
 * Tracer class for RPC call tracing
 */
class Tracer {
    /**
     * Create a new tracer instance
     * @param {Object} logger - logger instance
     * @param {boolean} enabledRpcLog - whether RPC logging is enabled
     * @param {string} source - source service
     * @param {string} remote - remote service
     * @param {*} msg - message payload
     * @param {string} id - trace ID (optional, will generate if not provided)
     * @param {number} seq - sequence number (optional, defaults to 1)
     */
    constructor(logger, enabledRpcLog, source, remote, msg, id, seq) {
        this.isEnabled = enabledRpcLog;
        if (!enabledRpcLog) {
            return;
        }
        this.logger = logger;
        this.source = source;
        this.remote = remote;
        this.id = id || uuid();
        this.seq = seq || 1;
        this.msg = msg;
    }

    /**
     * Get logger context object
     * @param {string} role - role (client/server)
     * @param {string} module - module path
     * @param {string} method - method name
     * @param {string} description - operation description
     * @returns {Object} logger context
     */
    getLogger(role, module, method, description) {
        return {
            traceId: this.id,
            seq: this.seq++,
            role,
            source: this.source,
            remote: this.remote,
            module: getModule(module),
            method,
            args: this.msg,
            timestamp: Date.now(),
            description
        };
    }

    /**
     * Log info level message
     * @param {string} role - role (client/server)
     * @param {string} module - module path
     * @param {string} method - method name
     * @param {string} description - operation description
     */
    info(role, module, method, description) {
        if (this.isEnabled) {
            this.logger.info(JSON.stringify(this.getLogger(role, module, method, description)));
        }
    }

    /**
     * Log debug level message
     * @param {string} role - role (client/server)
     * @param {string} module - module path
     * @param {string} method - method name
     * @param {string} description - operation description
     */
    debug(role, module, method, description) {
        if (this.isEnabled) {
            this.logger.debug(JSON.stringify(this.getLogger(role, module, method, description)));
        }
    }

    /**
     * Log error level message
     * @param {string} role - role (client/server)
     * @param {string} module - module path
     * @param {string} method - method name
     * @param {string} description - operation description
     */
    error(role, module, method, description) {
        if (this.isEnabled) {
            this.logger.error(JSON.stringify(this.getLogger(role, module, method, description)));
        }
    }
}

module.exports = Tracer;

/**
 * Get shortened module path for logging
 * @param {string} module - full module path
 * @returns {string} shortened module path
 */
function getModule(module) {
    let rs = '';
    const strs = module.split('/');
    const lines = strs.slice(-3);
    for (let i = 0; i < lines.length; i++) {
        rs += `/${lines[i]}`;
    }
    return rs;
}
