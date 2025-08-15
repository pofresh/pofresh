const fs = require('fs');
const path = require('path');
const async = require('async');
const Loader = require('pofresh-loader');
const logger = require('pofresh-logger').getLogger('pofresh-rpc', 'rpc-client');
const failureProcess = require('./failureProcess');
const constants = require('../util/constants');
const Station = require('./mailstation');
const Tracer = require('../util/tracer');
const Proxy = require('../util/proxy');
const router = require('./router');

/**
 * Client states
 */
const STATE_INITED = 1; // client has inited
const STATE_STARTED = 2; // client has started
const STATE_CLOSED = 3; // client has closed

// State constants for internal use
const STATES = {
    INITED: STATE_INITED,
    STARTED: STATE_STARTED,
    CLOSED: STATE_CLOSED
};

/**
 * RPC Client Class
 * Manages RPC client connections and proxy creation
 */
class Client {
    /**
     * Create RPC client instance
     * @param {Object} opts - client options
     * @param {Object} opts.context - server context
     * @param {Object} opts.routeContext - routing context
     * @param {Function} opts.router - router function
     * @param {string} opts.routerType - router type
     * @param {boolean} opts.rpcDebugLog - enable debug logging
     */
    constructor(opts) {
        if (!opts) {
            throw new Error('Client options are required');
        }

        this.opts = opts;
        this._context = opts.context;
        this._routeContext = opts.routeContext;
        this.router = opts.router || router.df;
        this.routerType = opts.routerType;
        this.rpcDebugLog = opts.rpcDebugLog || false;
        
        if (this._context) {
            opts.clientId = this._context.serverId;
        }
        
        this.proxies = {};
        this._station = Station.create(opts);
        this.watchers = {};
        this.state = STATES.INITED;
    }

    /**
     * Start the rpc client which would try to connect the remote servers and
     * report the result by cb.
     *
     * @param {Function} cb - callback function (err)
     * @throws {Error} if client already started
     */
    start(cb) {
        if (typeof cb !== 'function') {
            throw new TypeError('Callback function is required');
        }
        
        if (this.state > STATES.INITED) {
            cb(new Error('rpc client has started.'));
            return;
        }

        this._station.start(err => {
            if (err) {
                logger.error(`[pofresh-rpc] client start fail for ${err.stack}`);
                return cb(err);
            }
            this._station.on('error', failureProcess.bind(this._station));
            this.state = STATES.STARTED;
            cb();
        });
    }

    /**
     * Stop the rpc client.
     *
     * @param {boolean} force - whether to force stop
     */
    stop(force) {
        if (this.state !== STATES.STARTED) {
            logger.warn('[pofresh-rpc] client is not running now.');
            return;
        }
        this.state = STATES.CLOSED;
        this._station.stop(force);
    }

    /**
     * Add a new proxy to the rpc client which would override the proxy under the
     * same key.
     *
     * @param {Object} record - proxy description record
     * @param {string} record.namespace - proxy namespace
     * @param {string} record.serverType - server type
     * @param {string} record.path - module path
     */
    addProxy(record) {
        if (!record || typeof record !== 'object') {
            return;
        }
        
        const { namespace, serverType, path } = record;
        if (!namespace || !serverType || !path) {
            logger.warn('[pofresh-rpc] invalid proxy record, missing required fields');
            return;
        }
        
        const proxy = generateProxy(this, record, this._context);
        if (!proxy) {
            return;
        }

        const proxies = this.proxies;
        proxies[namespace] = proxies[namespace] || {};
        
        if (proxies[namespace][serverType]) {
            // Merge with existing proxy
            for (const attr in proxy) {
                proxies[namespace][serverType][attr] = proxy[attr];
            }
        } else {
            proxies[namespace][serverType] = proxy;
        }
    }

    /**
     * Batch version for addProxy.
     *
     * @param {Array<Object>} records - list of proxy description records
     */
    addProxies(records) {
        if (!Array.isArray(records) || records.length === 0) {
            return;
        }
        records.forEach(record => this.addProxy(record));
    }

    /**
     * Add new remote server to the rpc client.
     *
     * @param {Object} server - new server information
     * @param {string} server.id - server id
     * @param {string} server.serverType - server type
     * @param {string} server.host - server host
     * @param {number} server.port - server port
     */
    addServer(server) {
        if (!server || typeof server !== 'object') {
            logger.warn('[pofresh-rpc] invalid server object');
            return;
        }
        this._station.addServer(server);
    }

    /**
     * Batch version for add new remote server.
     *
     * @param {Array<Object>} servers - server info list
     */
    addServers(servers) {
        if (!Array.isArray(servers) || servers.length === 0) {
            logger.warn('[pofresh-rpc] invalid servers array');
            return;
        }
        this._station.addServers(servers);
    }

    /**
     * Remove remote server from the rpc client.
     *
     * @param {string|number} id - server id
     */
    removeServer(id) {
        if (!id) {
            logger.warn('[pofresh-rpc] invalid server id');
            return;
        }
        this._station.removeServer(id);
    }

    /**
     * Batch version for remove remote server.
     *
     * @param {Array<string|number>} ids - remote server id list
     */
    removeServers(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            logger.warn('[pofresh-rpc] invalid server ids array');
            return;
        }
        this._station.removeServers(ids);
    }

    /**
     * Replace remote servers.
     *
     * @param {Array<Object>} servers - server info list
     */
    replaceServers(servers) {
        if (!Array.isArray(servers)) {
            logger.warn('[pofresh-rpc] invalid servers array');
            return;
        }
        this._station.replaceServers(servers);
    }

    /**
     * Do the rpc invoke directly.
     *
     * @param {string} serverId - remote server id
     * @param {Object} msg - rpc message. Message format:
     *    {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {string} msg.serverType - server type
     * @param {string} msg.service - service name
     * @param {string} msg.method - method name
     * @param {Array} msg.args - arguments
     * @param {Function} cb - callback function (err, ...)
     */
    rpcInvoke(serverId, msg, cb) {
        if (!serverId || typeof serverId !== 'string') {
            throw new TypeError('serverId must be a non-empty string');
        }
        
        if (!msg || typeof msg !== 'object') {
            throw new TypeError('msg must be an object');
        }
        
        if (typeof cb !== 'function') {
            throw new TypeError('Callback function is required');
        }
        
        const rpcDebugLog = this.rpcDebugLog;
        let tracer = null;

        if (rpcDebugLog) {
            tracer = new Tracer(this.opts.rpcLogger, this.opts.rpcDebugLog, this.opts.clientId, serverId, msg);
            tracer.info('client', __filename, 'rpcInvoke', 'the entrance of rpc invoke');
        }

        if (this.state !== STATES.STARTED) {
            tracer?.error('client', __filename, 'rpcInvoke', 'fail to do rpc invoke for client is not running');
            logger.error('[pofresh-rpc] fail to do rpc invoke for client is not running');
            cb(new Error('[pofresh-rpc] fail to do rpc invoke for client is not running'));
            return;
        }
        this._station.dispatch(tracer, serverId, msg, this.opts, cb);
    }

    /**
     * Add rpc before filter.
     *
     * @param {Function} filter - rpc before filter function
     */
    before(filter) {
        if (typeof filter !== 'function') {
            throw new TypeError('Filter must be a function');
        }
        this._station.before(filter);
    }

    /**
     * Add rpc after filter.
     *
     * @param {Function} filter - rpc after filter function
     */
    after(filter) {
        if (typeof filter !== 'function') {
            throw new TypeError('Filter must be a function');
        }
        this._station.after(filter);
    }

    /**
     * Add rpc filter.
     *
     * @param {Function} filter - rpc filter function
     */
    filter(filter) {
        if (typeof filter !== 'function') {
            throw new TypeError('Filter must be a function');
        }
        this._station.filter(filter);
    }

    /**
     * Set rpc filter error handler.
     *
     * @param {Function} handler - rpc filter error handler function
     */
    setErrorHandler(handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Error handler must be a function');
        }
        this._station.handleError = handler;
    }
}

/**
 * Generate proxies for remote servers.
 *
 * @param {Client} client - current client instance
 * @param {Object} record - proxy record info {namespace, serverType, path}
 * @param {string} record.namespace - proxy namespace
 * @param {string} record.serverType - server type
 * @param {string} record.path - module path
 * @param {Object} context - mailbox init context parameter
 * @returns {Object|null} generated proxy object or null
 * @private
 */
function generateProxy(client, record, context) {
    if (!record || typeof record !== 'object') {
        logger.warn('[pofresh-rpc] invalid record for proxy generation');
        return null;
    }
    
    const { namespace, serverType, path } = record;
    if (!namespace || !serverType || !path) {
        logger.warn('[pofresh-rpc] missing required fields in proxy record');
        return null;
    }
    
    try {
        const modules = Loader.load(path, context);
        if (!modules) {
            logger.warn(`[pofresh-rpc] failed to load modules from path: ${path}`);
            return null;
        }
        
        const res = {};
        for (const name in modules) {
            res[name] = Proxy.create({
                service: name,
                origin: modules[name],
                attach: record,
                proxyCB: proxyCB.bind(null, client)
            });
        }
        
        // Setup file watching for hot reload if enabled
        if (client.opts.reload && !client.watchers[path]) {
            setupFileWatcher(client, path, context, res, record);
        }
        
        return res;
    } catch (error) {
        logger.error(`[pofresh-rpc] error generating proxy for ${namespace}:${serverType}`, error);
        return null;
    }
}

/**
 * Setup file watcher for hot reload
 * @param {Client} client - client instance
 * @param {string} path - module path
 * @param {Object} context - loading context
 * @param {Object} res - proxy result object
 * @param {Object} record - proxy record
 * @private
 */
function setupFileWatcher(client, path, context, res, record) {
    try {
        const watcher = fs.watch(path);
        client.watchers[path] = watcher;
        
        watcher.on('change', (_event, filename) => {
            if (!filename) return;
            
            const name = path.basename(filename, '.js');
            const modules = Loader.load(path, context);
            if (modules && modules[name]) {
                try {
                    res[name] = Proxy.create({
                        service: name,
                        origin: modules[name],
                        attach: record,
                        proxyCB: proxyCB.bind(null, client)
                    });
                    logger.info(`[pofresh-rpc] reloaded proxy: ${name}`);
                } catch (error) {
                    logger.error(`[pofresh-rpc] error reloading proxy: ${name}`, error);
                }
            }
        });
        
        watcher.on('error', (error) => {
            logger.error(`[pofresh-rpc] file watcher error for path: ${path}`, error);
            delete client.watchers[path];
        });
    } catch (error) {
        logger.error(`[pofresh-rpc] error setting up file watcher for path: ${path}`, error);
    }
}

/**
 * Generate proxy for function type field
 *
 * @param {Client} client - current client instance
 * @param {string} serviceName - delegated service name
 * @param {string} methodName - delegated method name
 * @param {Array} args - rpc invoke arguments
 * @param {Object} attach - attach parameter pass to proxyCB
 * @param {string} attach.namespace - namespace
 * @param {string} attach.serverType - server type
 * @param {boolean} isToSpecifiedServer - true means rpc route to specified remote server
 * @private
 */
function proxyCB(client, serviceName, methodName, args, attach, isToSpecifiedServer) {
    if (client.state !== STATES.STARTED) {
        logger.error('[pofresh-rpc] fail to invoke rpc proxy for client is not running');
        return;
    }
    
    if (!Array.isArray(args) || args.length < 2) {
        logger.error(
            '[pofresh-rpc] invalid rpc invoke, arguments length less than 2, namespace: %j, serverType: %j, serviceName: %j, methodName: %j',
            attach?.namespace,
            attach?.serverType,
            serviceName,
            methodName
        );
        return;
    }
    
    const routeParam = args.shift();
    const cb = args.pop();
    
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is not a function');
        return;
    }
    
    if (!attach || !attach.namespace || !attach.serverType) {
        const error = new Error('Invalid attach parameters');
        logger.error('[pofresh-rpc] invalid attach parameters for proxy callback');
        cb(error);
        return;
    }
    
    const serverType = attach.serverType;
    const msg = {
        namespace: attach.namespace,
        serverType,
        service: serviceName,
        method: methodName,
        args
    };

    if (isToSpecifiedServer) {
        rpcToSpecifiedServer(client, msg, serverType, routeParam, cb);
    } else {
        getRouteTarget(client, serverType, msg, routeParam, (err, serverId) => {
            if (err) {
                return cb(err);
            }
            client.rpcInvoke(serverId, msg, cb);
        });
    }
}

/**
 * Calculate remote target server id for rpc client.
 *
 * @param {Client} client - current client instance
 * @param {string} serverType - remote server type
 * @param {*} routeParam - routing parameter
 * @param {Object} msg - send message
 * @param {Function} cb - callback function (err, serverId)
 * @private
 */
function getRouteTarget(client, serverType, msg, routeParam, cb) {
    if (typeof cb !== 'function') {
        logger.error('[pofresh-rpc] callback is required for getRouteTarget');
        return;
    }
    
    if (!serverType || typeof serverType !== 'string') {
        cb(new Error('serverType must be a non-empty string'));
        return;
    }
    
    try {
        if (client.routerType) {
            const method = getRoutingMethod(client.routerType);
            if (!method) {
                cb(new Error(`Unknown router type: ${client.routerType}`));
                return;
            }
            
            method.call(null, client, serverType, msg, (err, serverId) => {
                if (err) {
                    logger.error(`[pofresh-rpc] routing error for ${serverType}:`, err);
                }
                cb(err, serverId);
            });
        } else {
            // Use custom router function
            const { route, target } = getCustomRouter(client);
            if (!route) {
                cb(new Error('invalid route function'));
                return;
            }
            
            route.call(target, routeParam, msg, client._routeContext, (err, serverId) => {
                if (err) {
                    logger.error('[pofresh-rpc] custom routing error:', err);
                }
                cb(err, serverId);
            });
        }
    } catch (error) {
        logger.error('[pofresh-rpc] unexpected error in getRouteTarget:', error);
        cb(error);
    }
}

/**
 * Get routing method based on router type
 * @param {string} routerType - router type
 * @returns {Function|null} routing method or null
 * @private
 */
function getRoutingMethod(routerType) {
    switch (routerType) {
        case constants.SCHEDULE.ROUNDROBIN:
            return router.rr;
        case constants.SCHEDULE.WEIGHT_ROUNDROBIN:
            return router.wrr;
        case constants.SCHEDULE.LEAST_ACTIVE:
            return router.la;
        case constants.SCHEDULE.CONSISTENT_HASH:
            return router.ch;
        default:
            return router.rd;
    }
}

/**
 * Get custom router function and target
 * @param {Client} client - client instance
 * @returns {Object} {route, target}
 * @private
 */
function getCustomRouter(client) {
    if (typeof client.router === 'function') {
        return { route: client.router, target: null };
    } else if (client.router && typeof client.router.route === 'function') {
        return { route: client.router.route, target: client.router };
    }
    return { route: null, target: null };
}

/**
 * Rpc to specified server id or servers.
 *
 * @param {Client} client - current client instance
 * @param {Object} msg - rpc message
 * @param {string} serverType - remote server type
 * @param {string} serverId - target server id or '*' for all servers
 * @param {Function} cb - rpc callback
 * @private
 */
function rpcToSpecifiedServer(client, msg, serverType, serverId, cb) {
    if (typeof serverId !== 'string') {
        const error = new Error(`serverId is not a string: ${serverId}`);
        logger.error('[pofresh-rpc] serverId is not a string:', serverId);
        cb(error);
        return;
    }
    
    if (serverId === '*') {
        // Broadcast to all servers of the specified type
        const servers = client._routeContext?.getServersByType?.(serverType);
        if (!servers || !Array.isArray(servers) || servers.length === 0) {
            const error = new Error(`serverType ${serverType} servers not exist`);
            logger.error('[pofresh-rpc] serverType %s servers not exist', serverType);
            cb(error);
            return;
        }

        // Execute RPC calls in parallel
        async.each(
            servers,
            (server, next) => {
                if (!server || !server.id) {
                    next(new Error('Invalid server object'));
                    return;
                }
                client.rpcInvoke(server.id, msg, err => {
                    next(err);
                });
            },
            cb
        );
    } else {
        // Send to specific server
        client.rpcInvoke(serverId, msg, cb);
    }
}

/**
 * RPC client factory method.
 *
 * @param {Object} opts - client init parameter
 * @param {Object} opts.context - mail box init parameter
 * @param {Function} [opts.router] - rpc message route function, route(routeParam, msg, cb)
 * @param {Object} [opts.mailBoxFactory] - mail box factory instance
 * @param {string} [opts.routerType] - router type
 * @param {boolean} [opts.rpcDebugLog] - enable debug logging
 * @param {Object} [opts.routeContext] - routing context
 * @returns {Client} client instance
 */
module.exports.create = opts => {
    if (!opts) {
        throw new Error('Client options are required');
    }
    return new Client(opts);
};

// Export Client class for direct usage
module.exports.Client = Client;

// Export client states
module.exports.STATE = STATES;

// Mailbox exports
module.exports.SIOMailbox = require('./mailboxes/sio-mailbox'); // socket.io
module.exports.WSMailbox = require('./mailboxes/ws-mailbox'); // ws
module.exports.TCPMailbox = require('./mailboxes/TCP-mailbox'); // tcp
module.exports.MQTTMailbox = require('./mailboxes/mqtt-mailbox'); // mqtt

// Export all mailboxes as a map
module.exports.Mailboxes = {
    SIO: module.exports.SIOMailbox,
    WS: module.exports.WSMailbox,
    TCP: module.exports.TCPMailbox,
    MQTT: module.exports.MQTTMailbox
};
