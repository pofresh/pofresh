const fs = require('fs');
const utils = require('../../util/utils');
const Loader = require('pofresh-loader');
const pathUtil = require('../../util/pathUtil');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const forwardLogger = require('pofresh-logger').getLogger('forward-log', __filename);

/**
 * Handler service.
 * Dispatch request to the relactive handler.
 *
 * @param {Object} app      current application context
 */
class Service {
    constructor(app, opts) {
        this.name = 'handler';
        this.app = app;
        this.handlerMap = {};
        if (!!opts.reloadHandlers) {
            watchHandlers(app, this.handlerMap);
        }

        this.enableForwardLog = opts.enableForwardLog || false;
    }

    /**
     * Get handler instance by routeRecord.
     *
     * @param  {Object} handlers    handler map
     * @param  {Object} routeRecord route record parsed from route string
     * @return {Object}             handler instance if any matchs or null for match fail
     */
    getHandler(routeRecord) {
        let serverType = routeRecord.serverType;
        if (!this.handlerMap[serverType]) {
            loadHandlers(this.app, serverType, this.handlerMap);
        }
        let handlers = this.handlerMap[serverType] || {};
        let handler = handlers[routeRecord.handler];
        if (!handler) {
            logger.warn('could not find handler for routeRecord: %j', routeRecord);
            return null;
        }
        if (typeof handler[routeRecord.method] !== 'function') {
            logger.warn('could not find the method %s in handler: %s', routeRecord.method, routeRecord.handler);
            return null;
        }
        return handler;
    }

    /**
     * Handler the request.
     */
    handle(routeRecord, msg, session, cb) {
        // the request should be processed by current server
        let handler = this.getHandler(routeRecord);
        if (!handler) {
            logger.error('[handleManager]: fail to find handler for %j', msg.__route__);
            utils.invokeCallback(cb, new Error('fail to find handler for ' + msg.__route__));
            return;
        }
        let start = Date.now();
        let self = this;

        let callback = function (err, resp, opts) {
            if (self.enableForwardLog) {
                let log = {
                    route: msg.__route__,
                    args: msg,
                    time: utils.format(new Date(start)),
                    timeUsed: new Date() - start
                };
                forwardLogger.info(JSON.stringify(log));
            }

            utils.invokeCallback(cb, err, resp, opts);
        };

        let method = routeRecord.method;

        if (!Array.isArray(msg)) {
            handler[method](msg, session, callback);
        } else {
            msg.push(session);
            msg.push(callback);
            handler[method].apply(handler, msg);
        }
        return;
    }
}

module.exports = Service;

/**
 * Load handlers from current application
 */
function loadHandlers(app, serverType, handlerMap) {
    let p = pathUtil.getHandlerPath(app.getBase(), serverType);
    if (p) {
        handlerMap[serverType] = Loader.load(p, app);
    }
}

function watchHandlers(app, handlerMap) {
    let p = pathUtil.getHandlerPath(app.getBase(), app.serverType);
    if (!!p) {
        fs.watch(p, function (event, name) {
            if (event === 'change') {
                handlerMap[app.serverType] = Loader.load(p, app);
            }
        });
    }
}