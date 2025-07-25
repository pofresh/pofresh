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
        let type = msg.type,
            action = msg.action,
            uid = msg.uid,
            result = null;
        if (type === 'CPU') {
            if (action === 'start') {
                profiler.startProfiling();
            } else {
                result = profiler.stopProfiling();
                const res = {};
                res.head = result.getTopDownRoot();
                res.bottomUpHead = result.getBottomUpRoot();
                res.msg = msg;
                agent.notify(moduleId, { clientId: msg.clientId, type: type, body: res });
            }
        } else {
            const snapshot = profiler.takeSnapshot();
            const appBase = path.dirname(require.main.filename);
            const name = appBase + '/logs/' + utils.format(new Date()) + '.log';
            const log = fs.createWriteStream(name, { flags: 'a' });
            let data;
            snapshot.serialize({
                onData: function (chunk, size) {
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
                },
                onEnd: function () {
                    agent.notify(moduleId, {
                        clientId: msg.clientId,
                        type: type,
                        body: { params: { uid: uid } }
                    });
                    profiler.deleteAllSnapshots();
                }
            });
        }
    }

    masterHandler(agent, msg, cb) {
        if (msg.type === 'CPU') {
            this.proxy.stopCallBack(msg.body, msg.clientId, agent);
        } else {
            this.proxy.takeSnapCallBack(msg.body);
        }
    }

    clientHandler(agent, msg, cb) {
        if (msg.action === 'list') {
            list(agent, msg, cb);
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
