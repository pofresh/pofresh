/*!
 * pofresh -- consoleModule serverStop stop/kill
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const countDownLatch = require('../util/countDownLatch');
const utils = require('../util/utils');
const Constants = require('../util/constants');
const starter = require('../master/starter');

module.exports = opts => new Module(opts);

const moduleId = '__console__';

module.exports.moduleId = moduleId;

class Module {
    constructor(opts) {
        opts = opts || {};
        this.app = opts.app;
        this.starter = opts.starter;
    }

    monitorHandler(agent, msg, cb) {
        const serverId = agent.id;
        switch (msg.signal) {
            case 'stop':
                if (agent.type === Constants.RESERVED.MASTER) {
                    return;
                }
                this.app.stop(true);
                break;
            case 'list': {
                const serverType = agent.type;
                const pid = process.pid;
                const heapUsed = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
                const rss = (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);
                const heapTotal = (process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2);
                const uptime = (process.uptime() / 60).toFixed(2);
                utils.invokeCallback(cb, {
                    serverId,
                    body: {
                        serverId,
                        serverType,
                        pid,
                        rss,
                        heapTotal,
                        heapUsed,
                        uptime
                    }
                });
                break;
            }
            case 'kill':
                utils.invokeCallback(cb, serverId);
                if (agent.type !== 'master') {
                    setTimeout(() => {
                        process.exit(-1);
                    }, Constants.TIME.TIME_WAIT_MONITOR_KILL);
                }
                break;
            case 'addCron':
                this.app.addCrons([msg.cron]);
                break;
            case 'removeCron':
                this.app.removeCrons([msg.cron]);
                break;
            case 'blacklist':
                if (this.app.isFrontend()) {
                    const connector = this.app.components.__connector__;
                    for (const ip of msg.blacklist) {
                        if (connector.blacklist.indexOf(ip) === -1) {
                            connector.blacklist.push(ip);
                        }
                    }
                }
                break;
            case 'restart': {
                if (agent.type === Constants.RESERVED.MASTER) {
                    return utils.invokeCallback(cb);
                }
                const server = this.app.get(Constants.RESERVED.CURRENT_SERVER);
                utils.invokeCallback(cb, server);
                process.nextTick(() => {
                    setTimeout(() => this.app.stop(true), 1000);
                });
                break;
            }
            default:
                logger.error('receive error signal: %j', msg);
                break;
        }
    }

    clientHandler(agent, msg, cb) {
        const app = this.app;
        switch (msg.signal) {
            case 'kill':
                kill(app, agent, msg, cb);
                break;
            case 'stop':
                stop(app, agent, msg, cb);
                break;
            case 'list':
                list(agent, msg, cb);
                break;
            case 'add':
                add(app, msg, cb);
                break;
            case 'addCron':
                addCron(app, agent, msg, cb);
                break;
            case 'removeCron':
                removeCron(app, agent, msg, cb);
                break;
            case 'blacklist':
                blacklist(agent, msg, cb);
                break;
            case 'restart':
                restart(app, agent, msg, cb);
                break;
            default:
                utils.invokeCallback(cb, new Error('The command cannot be recognized, please check.'), null);
                break;
        }
    }
}

function kill(_app, agent, msg, cb) {
    let sid, record;
    const serverIds = [];
    const count = utils.size(agent.idMap);
    const latch = countDownLatch.createCountDownLatch(
        count,
        { timeout: Constants.TIME.TIME_WAIT_MASTER_KILL },
        isTimeout => {
            if (isTimeout) {
                utils.invokeCallback(cb, null, { code: 'remained', serverIds });
            } else {
                utils.invokeCallback(cb, null, { code: 'ok' });
            }
            setTimeout(() => {
                process.exit(-1);
            }, Constants.TIME.TIME_WAIT_MONITOR_KILL);
        }
    );

    const agentRequestCallback = _msg => {
        for (let i = 0; i < serverIds.length; ++i) {
            if (serverIds[i] === _msg) {
                serverIds.splice(i, 1);
                latch.done();
                break;
            }
        }
    };

    for (sid in agent.idMap) {
        record = agent.idMap[sid];
        serverIds.push(record.id);
        agent.request(record.id, moduleId, { signal: msg.signal }, agentRequestCallback);
    }
}

function stop(app, agent, msg, cb) {
    let serverIds = msg.ids;
    let servers = null;
    if (serverIds.length) {
        servers = app.getServers();
        app.set(Constants.RESERVED.STOP_SERVERS, serverIds);

        for (const serverId of serverIds) {
            if (servers[serverId]) {
                agent.notifyById(serverId, moduleId, { signal: msg.signal });
            } else {
                utils.invokeCallback(cb, new Error('Cannot find the server to stop.'), null);
            }
        }
        utils.invokeCallback(cb, null, { status: 'part' });
    } else {
        servers = app.getServers();
        serverIds = [];
        for (const j in servers) {
            serverIds.push(j);
        }
        app.set(Constants.RESERVED.STOP_SERVERS, serverIds);
        agent.notifyAll(moduleId, { signal: msg.signal });
        setTimeout(() => {
            utils.invokeCallback(cb, null, { status: 'all' });
            app.stop(true);
        }, Constants.TIME.TIME_WAIT_STOP);
    }
}

function restart(app, agent, msg, cb) {
    let successFlag;
    const successIds = [];
    const serverIds = msg.ids;
    const type = msg.type;
    let servers;
    if (!serverIds.length && type) {
        servers = app.getServersByType(type);
        if (!servers) {
            utils.invokeCallback(cb, new Error(`restart servers with unknown server type: ${type}`));
            return;
        }
        for (const server of servers.length) {
            serverIds.push(server.id);
        }
    } else if (!serverIds.length) {
        servers = app.getServers();
        for (const key in servers) {
            serverIds.push(key);
        }
    }
    const count = serverIds.length;
    const latch = countDownLatch.createCountDownLatch(count, { timeout: Constants.TIME.TIME_WAIT_COUNTDOWN }, () => {
        if (!successFlag) {
            utils.invokeCallback(cb, new Error('all servers start failed.'));
            return;
        }
        utils.invokeCallback(cb, null, utils.arrayDiff(serverIds, successIds));
        for (const id of successIds) {
            agent.request(id, Constants.KEYWORDS.MONITOR_WATCHER, { action: 'startOver' }, () => {
                // console.log('startOver', id)
            })
        }
    });

    const request = id =>
        (() => {
            agent.request(id, moduleId, { signal: msg.signal }, resMsg => {
                if (!utils.size(resMsg)) {
                    latch.done();
                    return;
                }
                setTimeout(() => {
                    runServer(app, resMsg, (err, _status) => {
                        if (err) {
                            logger.error(`restart ${id} failed.`);
                        } else {
                            successIds.push(id);
                            successFlag = true;
                        }
                        latch.done();
                    });
                }, Constants.TIME.TIME_WAIT_RESTART);
            });
        })();

    for (const serverId in serverIds) {
        request(serverId);
    }
}

function list(agent, msg, cb) {
    let sid, record;
    const serverInfo = {};
    const count = utils.size(agent.idMap);
    const latch = countDownLatch.createCountDownLatch(count, { timeout: Constants.TIME.TIME_WAIT_COUNTDOWN }, () => {
        utils.invokeCallback(cb, null, { msg: serverInfo });
    });

    const callback = _msg => {
        serverInfo[_msg.serverId] = _msg.body;
        latch.done();
    };
    for (sid in agent.idMap) {
        record = agent.idMap[sid];
        agent.request(record.id, moduleId, { signal: msg.signal }, callback);
    }
}

function add(app, msg, cb) {
    if (checkCluster(msg)) {
        startCluster(app, msg, cb);
    } else {
        startServer(app, msg, cb);
    }
    reset(ServerInfo);
}

function addCron(_app, agent, msg, cb) {
    const cron = parseArgs(msg, CronInfo, cb);
    sendCronInfo(cron, agent, msg, CronInfo, cb);
}

function removeCron(_app, agent, msg, cb) {
    const cron = parseArgs(msg, RemoveCron, cb);
    sendCronInfo(cron, agent, msg, RemoveCron, cb);
}

function blacklist(agent, msg, cb) {
    const ips = msg.args;
    for (const ip of ips) {
        if (!new RegExp(/(\d+)\.(\d+)\.(\d+)\.(\d+)/g).test(ip)) {
            utils.invokeCallback(cb, new Error(`blacklist ip: ${ip} is error format.`), null);
            return;
        }
    }
    agent.notifyAll(moduleId, { signal: msg.signal, blacklist: msg.args });
    process.nextTick(() => {
        cb(null, { status: 'ok' });
    });
}

function parseArgs(msg, info, cb) {
    const rs = {};
    for (const arg of msg.args) {
        if (arg.indexOf('=') < 0) {
            cb(new Error('Error server parameters format.'), null);
            return;
        }
        const pairs = arg.split('=');
        const key = pairs[0];
        if (info[key]) {
            info[key] = 1;
        }
        rs[pairs[0]] = pairs[1];
    }
    return rs;
}

function sendCronInfo(cron, agent, msg, info, cb) {
    if (isReady(info) && (cron.serverId || cron.serverType)) {
        if (cron.serverId) {
            agent.notifyById(cron.serverId, moduleId, { signal: msg.signal, cron });
        } else {
            agent.notifyByType(cron.serverType, moduleId, {
                signal: msg.signal,
                cron
            });
        }
        process.nextTick(() => {
            cb(null, { status: 'ok' });
        });
    } else {
        cb(new Error('Miss necessary server parameters.'), null);
    }
    reset(info);
}

function startServer(app, msg, cb) {
    const server = parseArgs(msg, ServerInfo, cb);
    if (isReady(ServerInfo)) {
        runServer(app, server, cb);
    } else {
        cb(new Error('Miss necessary server parameters.'), null);
    }
}

function runServer(app, server, cb) {
    utils.checkPort(server, status => {
        if (status === 'busy') {
            utils.invokeCallback(cb, new Error('Port occupied already, check your server to add.'));
        } else {
            starter.run(app, server, err => {
                if (err) {
                    utils.invokeCallback(cb, new Error(err));
                    return;
                }
            });
            process.nextTick(() => {
                utils.invokeCallback(cb, null, { status: 'ok' });
            });
        }
    });
}

function startCluster(app, msg, cb) {
    const serverMap = {};
    const fails = [];
    let successFlag;
    const serverInfo = parseArgs(msg, ClusterInfo, cb);
    utils.loadCluster(app, serverInfo, serverMap);
    const count = utils.size(serverMap);
    const latch = countDownLatch.createCountDownLatch(count, () => {
        if (!successFlag) {
            utils.invokeCallback(cb, new Error('all servers start failed.'));
            return;
        }
        utils.invokeCallback(cb, null, fails);
    });

    const start = server =>
        (() => {
            utils.checkPort(server, status => {
                if (status === 'busy') {
                    fails.push(server);
                    latch.done();
                } else {
                    starter.run(app, server, err => {
                        if (err) {
                            fails.push(server);
                            latch.done();
                        }
                    });
                    process.nextTick(() => {
                        successFlag = true;
                        latch.done();
                    });
                }
            });
        })();
    for (const key in serverMap) {
        const server = serverMap[key];
        start(server);
    }
}

function checkCluster(msg) {
    let flag = false;
    for (const arg of msg.args) {
        if (utils.startsWith(arg, Constants.RESERVED.CLUSTER_COUNT)) {
            flag = true;
        }
    }
    return flag;
}

function isReady(info) {
    for (const key in info) {
        if (info[key]) {
            return false;
        }
    }
    return true;
}

function reset(info) {
    for (const key in info) {
        info[key] = 0;
    }
}

const ServerInfo = {
    host: 0,
    port: 0,
    id: 0,
    serverType: 0
};

const CronInfo = {
    id: 0,
    action: 0,
    time: 0
};

const RemoveCron = {
    id: 0
};

const ClusterInfo = {
    host: 0,
    port: 0,
    clusterCount: 0
};
