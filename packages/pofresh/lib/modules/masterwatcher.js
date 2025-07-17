const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const utils = require('../util/utils');
const Constants = require('../util/constants');
const MasterWatchdog = require('../master/watchdog');

module.exports = function(opts, consoleService) {
  return new Module(opts, consoleService);
};

module.exports.moduleId = Constants.KEYWORDS.MASTER_WATCHER;

class Module {
  constructor(opts, consoleService) {
    this.app = opts.app;
    this.service = consoleService;
    this.id = this.app.getServerId();

    this.watchdog = new MasterWatchdog(this.app, this.service);
    this.service.on('register', onServerAdd.bind(null, this));
    this.service.on('disconnect', onServerLeave.bind(null, this));
    this.service.on('reconnect', onServerReconnect.bind(null, this));
  }

  start(cb) {
    utils.invokeCallback(cb);
  }

  masterHandler(agent, msg, cb) {
    if (!msg) {
      logger.warn('masterWatcher receive empty message.');
      return;
    }
    const func = masterMethods[msg.action];
    if (!func) {
      logger.info('masterWatcher unknown action: %j', msg.action);
      return;
    }
    func(this, agent, msg, cb);
  }
}

// ----------------- bind methods -------------------------

function onServerAdd(module, record) {
  logger.debug('masterWatcher receive add server event, with server: %j', record);
  if (!record || record.type === 'client' || !record.serverType) {
    return;
  }
  module.watchdog.addServer(record);
}

function onServerReconnect(module, record) {
  logger.debug('masterWatcher receive reconnect server event, with server: %j', record);
  if (!record || record.type === 'client' || !record.serverType) {
    logger.warn('onServerReconnect receive wrong message: %j', record);
    return;
  }
  module.watchdog.reconnectServer(record);
}

function onServerLeave(module, id, type) {
  logger.debug('masterWatcher receive remove server event, with server: %s, type: %s', id, type);
  if (!id) {
    logger.warn('onServerLeave receive server id is empty.');
    return;
  }
  if (type !== 'client') {
    module.watchdog.removeServer(id);
  }
}

// ----------------- module methods -------------------------

// ----------------- monitor request methods -------------------------

function subscribe(module, agent, msg, cb) {
  if (!msg) {
    utils.invokeCallback(cb, new Error('masterWatcher subscribe empty message.'));
    return;
  }

  module.watchdog.subscribe(msg.id);
  utils.invokeCallback(cb, null, module.watchdog.query());
}

function unsubscribe(module, agent, msg, cb) {
  if (!msg) {
    utils.invokeCallback(cb, new Error('masterWatcher unsubscribe empty message.'));
    return;
  }
  module.watchdog.unsubscribe(msg.id);
  utils.invokeCallback(cb);
}

function query(module, agent, msg, cb) {
  utils.invokeCallback(cb, null, module.watchdog.query());
}

function record(module, agent, msg, cb) {
  if (!msg) {
    utils.invokeCallback(cb, new Error('masterWatcher record empty message.'));
    return;
  }
  module.watchdog.record(msg.id);
}

const masterMethods = {
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  query: query,
  record: record
};
