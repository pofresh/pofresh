/*!
 * pofresh
 * Copyright(c) 2012 xiechengchao <xiecc@163.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var fs = require('fs');
var path = require('path');
var application = require('./application');
var Package = require('../package');

/**
 * Expose `createApplication()`.
 *
 * @module
 */

var pofresh = module.exports = {};

/**
 * Framework version.
 */

pofresh.version = Package.version;

/**
 * Event definitions that would be emitted by app.event
 */
pofresh.events = require('./util/events');

/**
 * auto loaded components
 */
pofresh.components = {};

/**
 * auto loaded filters
 */
pofresh.filters = {};

/**
 * auto loaded rpc filters
 */
pofresh.rpcFilters = {};

/**
 * connectors
 */
pofresh.connectors = {};
pofresh.connectors.__defineGetter__('sioconnector', load.bind(null, './connectors/sioconnector'));
pofresh.connectors.__defineGetter__('hybridconnector', load.bind(null, './connectors/hybridconnector'));
pofresh.connectors.__defineGetter__('udpconnector', load.bind(null, './connectors/udpconnector'));
pofresh.connectors.__defineGetter__('mqttconnector', load.bind(null, './connectors/mqttconnector'));

/**
 * pushSchedulers
 */
pofresh.pushSchedulers = {};
pofresh.pushSchedulers.__defineGetter__('direct', load.bind(null, './pushSchedulers/direct'));
pofresh.pushSchedulers.__defineGetter__('buffer', load.bind(null, './pushSchedulers/buffer'));

var self = this;

/**
 * Create an pofresh application.
 *
 * @return {Application}
 * @memberOf pofresh
 * @api public
 */
pofresh.createApp = function (opts) {
  var app = application;
  app.init(opts);
  self.app = app;
  return app;
};

/**
 * Get application
 */
Object.defineProperty(pofresh, 'app', {
  get:function () {
    return self.app;
  }
});

/**
 * Auto-load bundled components with getters.
 */
fs.readdirSync(__dirname + '/components').forEach(function (filename) {
  if (!/\.js$/.test(filename)) {
    return;
  }
  var name = path.basename(filename, '.js');
  var _load = load.bind(null, './components/', name);
  
  pofresh.components.__defineGetter__(name, _load);
  pofresh.__defineGetter__(name, _load);
});

fs.readdirSync(__dirname + '/filters/handler').forEach(function (filename) {
  if (!/\.js$/.test(filename)) {
    return;
  }
  var name = path.basename(filename, '.js');
  var _load = load.bind(null, './filters/handler/', name);
  
  pofresh.filters.__defineGetter__(name, _load);
  pofresh.__defineGetter__(name, _load);
});

fs.readdirSync(__dirname + '/filters/rpc').forEach(function (filename) {
  if (!/\.js$/.test(filename)) {
    return;
  }
  var name = path.basename(filename, '.js');
  var _load = load.bind(null, './filters/rpc/', name);
  
  pofresh.rpcFilters.__defineGetter__(name, _load);
});

function load(path, name) {
  if (name) {
    return require(path + name);
  }
  return require(path);
}
