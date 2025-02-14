const logger = require('pofresh-logger').getLogger('pofresh-admin', __filename);
const utils = require('../util/utils');

const inspector = require('inspector');
const session = new inspector.Session();

const fs = require('fs');
const ProfileProxy = require('../util/profileProxy');
const path = require("path");

module.exports = function (opts) {
    return new Module(opts);
};

const moduleId = 'profiler';

module.exports.moduleId = moduleId;

class Module {
    constructor(opts) {
        if (opts && opts.isMaster) {
            this.proxy = new ProfileProxy();
        }
    }

    monitorHandler(agent, msg, cb) {
        let type = msg.type, action = msg.action, uid = msg.uid, result = null;
        if (type === 'CPU') {
            if (action === 'start') {
                session.post('Profiler.enable', () => {
                    session.post('Profiler.start', () => {});
                });
            } else {
                session.post('Profiler.stop', (err, { profile }) => {
                    const res = {};
                    res.head = profile;
                    res.bottomUpHead = null; // inspector does not provide bottom-up view
                    res.msg = msg;
                    agent.notify(moduleId, {clientId: msg.clientId, type: type, body: res});
                });
            }
        } else {
            session.post('HeapProfiler.enable', () => {
                session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false }, (err, { uid: snapshotId }) => {
                    const appBase = path.dirname(require.main.filename);
                    const name = appBase + '/logs/' + utils.format(new Date()) + '.log';
                    const log = fs.createWriteStream(name, {'flags': 'a'});
                    session.on('HeapProfiler.addHeapSnapshotChunk', ({ params }) => {
                        const data = {
                            method: 'Profiler.addHeapSnapshotChunk',
                            params: {
                                uid: uid,
                                chunk: params.chunk
                            }
                        };
                        log.write(params.chunk);
                        agent.notify(moduleId, {clientId: msg.clientId, type: type, body: data});
                    });
                    session.on('HeapProfiler.reportHeapSnapshotProgress', ({ done }) => {
                        if (done) {
                            agent.notify(moduleId, {
                                clientId: msg.clientId,
                                type: type,
                                body: {params: {uid: uid}}
                            });
                            session.post('HeapProfiler.disable', () => {});
                        }
                    });
                });
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