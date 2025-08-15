/**
 * pofresh-rpc proxy module
 * Provides proxy creation utilities for remote service calls
 */

const logger = require('pofresh-logger').getLogger('pofresh-rpc', 'rpc-proxy');

/**
 * Proxy creation options
 * @typedef {Object} ProxyOptions
 * @property {Object} origin - delegated object
 * @property {Function} proxyCB - proxy invoke callback
 * @property {string} service - delegated service name
 * @property {Object} attach - attach parameter pass to proxyCB
 */

/**
 * Create a proxy for remote service calls
 *
 * @param {ProxyOptions} opts - construct parameters
 * @returns {Object|null} proxy instance or null if invalid options
 */
function createProxy(opts) {
    if (!opts || typeof opts !== 'object') {
        logger.warn('[pofresh-rpc] proxy options are required');
        return null;
    }

    if (!opts.origin || typeof opts.origin !== 'object') {
        logger.warn('[pofresh-rpc] opts.origin should be an object');
        return null;
    }

    if (!opts.proxyCB || typeof opts.proxyCB !== 'function') {
        logger.warn('[pofresh-rpc] opts.proxyCB is not a function, return the origin module directly');
        return opts.origin;
    }

    if (!opts.service || typeof opts.service !== 'string') {
        logger.warn('[pofresh-rpc] opts.service should be a non-empty string');
        return null;
    }

    try {
        return generateProxyFromOrigin(opts);
    } catch (error) {
        logger.error(`[pofresh-rpc] error creating proxy for service ${opts.service}:`, error);
        return null;
    }
}

/**
 * Generate proxy functions from origin object prototype chain
 * @param {ProxyOptions} opts - proxy options
 * @returns {Object} proxy instance with all methods
 * @private
 */
function generateProxyFromOrigin(opts) {
    const proxyMethods = {};
    let currentPrototype = opts.origin.__proto__;

    while (currentPrototype && currentPrototype !== Object.prototype && currentPrototype !== null) {
        const methodNames = Reflect.ownKeys(currentPrototype);

        methodNames.forEach(methodName => {
            if (typeof currentPrototype[methodName] === 'function' && methodName !== 'constructor') {
                proxyMethods[methodName] = createFunctionProxy(
                    opts.service,
                    methodName,
                    opts.origin,
                    opts.attach,
                    opts.proxyCB
                );
            }
        });

        currentPrototype = currentPrototype.__proto__;
    }

    return proxyMethods;
}

/**
 * Create a function proxy for remote method calls
 *
 * @param {string} serviceName - delegated service name
 * @param {string} methodName - delegated method name
 * @param {Object} origin - origin object
 * @param {Object} attach - attach object
 * @param {Function} proxyCB - proxy callback function
 * @returns {Function} proxy function with toServer method
 * @private
 */
function createFunctionProxy(serviceName, methodName, origin, attach, proxyCB) {
    const proxy = function () {
        const args = Array.from(arguments);
        proxyCB(serviceName, methodName, args, attach);
    };

    /**
     * Route to specific server
     * @returns {Function} proxy function for specific server routing
     */
    proxy.toServer = function () {
        const args = Array.from(arguments);
        proxyCB(serviceName, methodName, args, attach, true);
    };

    return proxy;
}

module.exports = {
    create: createProxy
};
