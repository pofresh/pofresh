const logger = require('pofresh-logger').getLogger('pofresh-admin', __filename);
const utils = require('../util/utils');

let profiler = null;
try {
    profiler = require('v8-profiler-next');
} catch (e) {
    logger.error(e);
}

const fs = require('fs');
const ProfileProxy = require('../util/profileProxy');
const path = require('path');

module.exports = function (opts) {
    if (!profiler) {
        return {};
    } else {
        return new Module(opts);
    }
};

if (!profiler) {
    module.exports.moduleError = 1;
}

const moduleId = 'profiler';

module.exports.moduleId = moduleId;

class Module {
    constructor(opts) {
        if (opts && opts.isMaster) {
            this.proxy = new ProfileProxy();
        }
    }

    monitorHandler(agent, msg, cb) {
        // 输入验证
        if (!msg || typeof msg !== 'object') {
            return cb && cb(new Error('Invalid message format'));
        }

        const type = msg.type,
            action = msg.action,
            uid = msg.uid;
        let result = null;

        try {
            if (type === 'CPU') {
                if (action === 'start') {
                    profiler.startProfiling();
                    cb && cb(null, 'CPU profiling started');
                } else {
                    result = profiler.stopProfiling();
                    if (!result) {
                        return cb && cb(new Error('No CPU profiling session to stop'));
                    }
                    const res = {};
                    res.head = result.getTopDownRoot();
                    res.bottomUpHead = result.getBottomUpRoot();
                    res.msg = msg;
                    agent.notify(moduleId, { clientId: msg.clientId, type: type, body: res });
                    cb && cb(null, 'CPU profiling stopped');
                }
            } else {
                const snapshot = profiler.takeSnapshot();
                const appBase = path.dirname(require.main.filename);
                const logsDir = path.join(appBase, 'logs');

                // 确保logs目录存在
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }

                const name = path.join(logsDir, utils.format(new Date()) + '.log');
                const log = fs.createWriteStream(name, { flags: 'a' });
                let data;

                // 添加错误处理
                log.on('error', (err) => {
                    logger.error('Failed to write heap snapshot:', err);
                    cb && cb(err);
                });

                snapshot.serialize({
                    onData: function (chunk) {
                        try {
                            chunk = chunk + '';
                            data = {
                                method: 'Profiler.addHeapSnapshotChunk',
                                params: {
                                    uid: uid,
                                    chunk: chunk
                                }
                            };
                            log.write(chunk);
                            agent.notify(moduleId, { clientId: msg.clientId, type: type, body: data });
                        } catch (err) {
                            logger.error('Error processing heap snapshot chunk:', err);
                        }
                    },
                    onEnd: function () {
                        try {
                            agent.notify(moduleId, {
                                clientId: msg.clientId,
                                type: type,
                                body: { params: { uid: uid } }
                            });
                            profiler.deleteAllSnapshots();
                            log.end(); // 确保文件流正确关闭
                            cb && cb(null, 'Heap snapshot completed');
                        } catch (err) {
                            logger.error('Error completing heap snapshot:', err);
                            cb && cb(err);
                        }
                    }
                });
            }
        } catch (err) {
            logger.error('Profiler error:', err);
            cb && cb(err);
        }
    }

    masterHandler(agent, msg, _cb) {
        if (msg.type === 'CPU') {
            this.proxy.stopCallBack(msg.body, msg.clientId, agent);
        } else {
            this.proxy.takeSnapCallBack(msg.body);
        }
    }

    clientHandler(agent, msg, _cb) {
        if (msg.action === 'list') {
            list(agent, msg, _cb);
            return;
        }

        if (typeof msg === 'string') {
            msg = JSON.parse(msg);
        }
        const id = msg.id;
        const command = msg.method.split('.');
        const method = command[1];
        const params = msg.params;
        const clientId = msg.clientId;

        if (!this.proxy[method] || typeof this.proxy[method] !== 'function') {
            return;
        }

        this.proxy[method](id, params, clientId, agent);
    }
}

function list(agent, msg, cb) {
    const servers = [];
    const idMap = agent.idMap;

    for (const sid in idMap) {
        servers.push(sid);
    }
    cb(null, servers);
}
