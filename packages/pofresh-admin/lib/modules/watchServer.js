/*!
 * pofresh -- consoleModule watchServer
 * Copyright(c) 2013 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
const countDownLatch = require('../util/countDownLatch');
const monitor = require('pofresh-monitor');
const utils = require('../util/utils');
const util = require('util');
const fs = require('fs');
const vm = require('vm');
const Constants = require('../util/constants');

const moduleId = 'watchServer';

module.exports = function(opts) {
  return new Module(opts);
};

module.exports.moduleId = moduleId;

class Module {
  constructor(opts) {
    opts = opts || {};
    this.app = opts.app;
  }

  monitorHandler(agent, msg, cb) {
    doHandler(Constants.TYPE_MONITOR, this.app, agent, msg, cb);
  }

  clientHandler(agent, msg, cb) {
    const { comd, context } = msg;
    if (!comd || !context) {
      return cb('lack of comd or context param');
    }

    doHandler(Constants.TYPE_CLIENT, this.app, agent, msg, cb);
  }
}

function doHandler(handle, app, agent, msg, cb) {
  const { comd, context, param } = msg;

  switch (comd) {
  case 'servers':
    showServers(handle, agent, comd, context, cb);
    break;
  case 'connections':
    showConnections(handle, agent, app, comd, context, cb);
    break;
  case 'logins':
    showLogins(handle, agent, app, comd, context, cb);
    break;
  case 'modules':
    showModules(handle, agent, comd, context, cb);
    break;
  case 'status':
    showStatus(handle, agent, comd, context, cb);
    break;
  case 'proxy':
    showProxy(handle, agent, app, comd, context, param, cb);
    break;
  case 'handler':
    showHandler(handle, agent, app, comd, context, param, cb);
    break;
  case 'components':
    showComponents(handle, agent, app, comd, context, param, cb);
    break;
  case 'settings':
    showSettings(handle, agent, app, comd, context, param, cb);
    break;
  case 'cpu':
    dumpCPU(handle, agent, comd, context, param, cb);
    break;
  case 'memory':
    dumpMemory(handle, agent, comd, context, param, cb);
    break;
  case 'get':
    getApp(handle, agent, app, comd, context, param, cb);
    break;
  case 'set':
    setApp(handle, agent, app, comd, context, param, cb);
    break;
  case 'enable':
    enableApp(handle, agent, app, comd, context, param, cb);
    break;
  case 'disable':
    disableApp(handle, agent, app, comd, context, param, cb);
    break;
  case 'run':
    runScript(handle, agent, app, comd, context, param, cb);
    break;
  default:
    showError(handle, agent, comd, context, cb);
  }
}

function showServers(handle, agent, comd, context, cb) {
  if (handle === 'client') {
    const serverInfo = {};
    const count = utils.size(agent.idMap);
    const latch = countDownLatch.createCountDownLatch(count, () => {
      cb(null, { msg: serverInfo });
    });

    let sid, record;
    for (sid in agent.idMap) {
      record = agent.idMap[sid];
      agent.request(record.id, moduleId, { comd, context }, (err, msg) => {
        serverInfo[msg.serverId] = msg.body;
        latch.done();
      });
    }
  } else if (handle === 'monitor') {
    const serverId = agent.id;
    const serverType = agent.type;
    const info = agent.info;
    const pid = process.pid;
    const heapUsed = (process.memoryUsage().heapUsed / (1000 * 1000)).toFixed(2);
    const uptime = (process.uptime() / 60).toFixed(2);
    cb(null, {
      serverId,
      body: {
        serverId,
        serverType,
        host: info.host,
        port: info.port,
        pid,
        heapUsed,
        uptime
      }
    });
  }
}

function showConnections(handle, agent, app, comd, context, cb) {
  if (handle === 'client') {
    let record;
    if (context === 'all') {
      const serverInfo = {};
      let sid;
      let count = 0;
      for (const key in agent.idMap) {
        if (agent.idMap[key].info.frontend === 'true') {
          count++;
        }
      }
      const latch = countDownLatch.createCountDownLatch(count, () => {
        cb(null, { msg: serverInfo });
      });

      for (sid in agent.idMap) {
        record = agent.idMap[sid];
        if (record.info.frontend === 'true') {
          agent.request(record.id, moduleId, { comd, context }, (err, msg) => {
            serverInfo[msg.serverId] = msg.body;
            latch.done();
          });
        }
      }
    } else {
      record = agent.idMap[context];
      if (!record) {
        return cb('the server ' + context + ' not exist');
      }
      if (record.info.frontend === 'true') {
        agent.request(record.id, moduleId, { comd, context }, (err, msg) => {
          const serverInfo = {};
          serverInfo[msg.serverId] = msg.body;
          cb(null, { msg: serverInfo });
        });
      } else {
        cb('\nthis command should be applied to frontend server\n');
      }
    }
  } else if (handle === 'monitor') {
    const connection = app.components.__connection__;
    if (!connection) {
      cb({ serverId: agent.id, body: 'error' });
      return;
    }

    cb(null, { serverId: agent.id, body: connection.getStatisticsInfo() });
  }
}

function showLogins(handle, agent, app, comd, context, cb) {
  showConnections(handle, agent, app, comd, context, cb);
}

function showModules(handle, agent, comd, context, cb) {
  const modules = agent.consoleService.modules;
  const result = [];
  for (const module in modules) {
    result.push(module);
  }
  cb(null, { msg: result });
}

function showStatus(handle, agent, comd, context, cb) {
  if (handle === 'client') {
    agent.request(context, moduleId, { comd, context }, (err, msg) => cb(err, { msg }));
  } else if (handle === 'monitor') {
    const params = { serverId: agent.id, pid: process.pid };
    monitor.psmonitor.getPsInfo(params, (err, data) => cb(err, { serverId: agent.id, body: data }));
  }
}

function showProxy(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    proxyCb(app, context, cb);
  }
}

function showHandler(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    handlerCb(app, context, cb);
  }
}

function showComponents(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    const _components = app.components;
    const res = {};
    for (const key in _components) {
      const name = getComponentName(key);
      res[name] = clone(name, app.get(name + 'Config'));
    }
    cb(null, res);
  }
}

function showSettings(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    const _settings = app.settings;
    const res = {};
    for (const key in _settings) {
      if (key.match(/^__\w+__$/) || key.match(/\w+Config$/)) {
        continue;
      }
      if (!checkJSON(_settings[key])) {
        res[key] = 'Object';
        continue;
      }
      res[key] = _settings[key];
    }
    cb(null, res);
  }
}

function dumpCPU(handle, agent, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    // let times = param.times;
    // let filepath = param.filepath;
    // let force = param.force;
    cb(null, 'cpu dump is unused in 1.0 of pofresh');
    /**
         if (!/\.cpuprofile$/.test(filepath)) {
         filepath = filepath + '.cpuprofile';
         }
         if (!times || !/^[0-9]*[1-9][0-9]*$/.test(times)) {
         cb('no times or times invalid error');
         return;
         }
         checkFilePath(filepath, force, function(err) {
         if (err) {
         cb(err);
         return;
         }
         //ndump.cpu(filepath, times);
         cb(null, filepath + ' cpu dump ok');
         });
         */
  }
}

function dumpMemory(handle, agent, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    let filepath = param.filepath;
    const force = param.force;
    if (!/\.heapsnapshot$/.test(filepath)) {
      filepath = filepath + '.heapsnapshot';
    }
    checkFilePath(filepath, force, err => {
      if (err) {
        cb(err);
        return;
      }
      let heapdump = null;
      try {
        heapdump = require('heapdump');
        heapdump.writeSnapshot(filepath);
        cb(null, filepath + ' memory dump ok');
      } catch (e) {
        cb('pofresh-admin require heapdump');
      }
    });
  }
}

function getApp(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    const res = app.get(param);
    cb(null, res || null);
  }
}

function setApp(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    const { key, value } = param;
    app.set(key, value);
    cb(null, 'set ' + key + ':' + value + ' ok');
  }
}

function enableApp(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    app.enable(param);
    cb(null, 'enable ' + param + ' ok');
  }
}

function disableApp(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }
  if (handle === 'monitor') {
    app.disable(param);
    cb(null, 'disable ' + param + ' ok');
  }
}

function runScript(handle, agent, app, comd, context, param, cb) {
  if (clientHandle(handle, agent, app, comd, context, param, cb)) {
    return;
  }

  if (handle === 'monitor') {
    const ctx = { app, result: null };
    try {
      vm.runInNewContext('result = ' + param, ctx, 'myApp.vm');
      cb(null, util.inspect(ctx.result));
    } catch (e) {
      cb(e.stack);
    }
  }
}

function showError(handle, agent, comd, context, cb) {}

function clientHandle(handle, agent, app, comd, context, param, cb) {
  if (handle === 'client') {
    if (context === 'all') {
      return cb('context error');
    }
    agent.request(context, moduleId, { comd, param, context }, (err, msg) => cb(err, msg));
    return true;
  }
  return false;
}

function clone(param, obj) {
  const result = {};
  let flag = 1;
  for (const key in obj) {
    if (typeof obj[key] === 'function' || typeof obj[key] === 'object') {
      continue;
    }
    flag = 0;
    result[key] = obj[key];
  }
  if (flag) {
    // return 'no ' + param + 'Config info';
  }
  return result;
}

function checkFilePath(filepath, force, cb) {
  if (!force && fs.existsSync(filepath)) {
    cb('filepath file exist');
    return;
  }
  fs.writeFile(filepath, 'test', err => {
    if (err) {
      cb('filepath invalid error');
      return;
    }
    fs.unlinkSync(filepath);
    cb(null);
  });
}

function proxyCb(app, context, cb) {
  const msg = {};
  const __proxy__ = app.components.__proxy__;
  if (__proxy__ && __proxy__.client && __proxy__.client.proxies.user) {
    const proxies = __proxy__.client.proxies.user;
    const server = app.getServerById(context);
    if (!server) {
      cb('no server with this id ' + context);
    } else {
      const type = server.serverType;
      const tmp = proxies[type];
      msg[type] = {};
      for (const _proxy in tmp) {
        const r = tmp[_proxy];
        msg[type][_proxy] = {};
        for (const _rpc in r) {
          if (typeof r[_rpc] === 'function') {
            msg[type][_proxy][_rpc] = 'function';
          }
        }
      }
      cb(null, msg);
    }
  } else {
    cb('no proxy loaded');
  }
}

function handlerCb(app, context, cb) {
  const msg = {};
  const __server__ = app.components.__server__;
  if (__server__ && __server__.server && __server__.server.handlerService.handlers) {
    const handles = __server__.server.handlerService.handlers;
    const server = app.getServerById(context);
    if (!server) {
      cb('no server with this id ' + context);
    } else {
      const type = server.serverType;
      const tmp = handles;
      msg[type] = {};
      for (const _p in tmp) {
        const r = tmp[_p];
        msg[type][_p] = {};
        for (const _r in r) {
          if (typeof r[_r] === 'function') {
            msg[type][_p][_r] = 'function';
          }
        }
      }
      cb(null, msg);
    }
  } else {
    cb('no handler loaded');
  }
}

function getComponentName(c) {
  let t = c.match(/^__(\w+)__$/);
  if (t) {
    t = t[1];
  }
  return t;
}

function checkJSON(obj) {
  if (!obj) {
    return true;
  }
  try {
    JSON.stringify(obj);
  } catch (e) {
    return false;
  }
  return true;
}
