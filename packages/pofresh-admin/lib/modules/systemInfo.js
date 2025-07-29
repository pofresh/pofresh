/*!
 * pofresh -- consoleModule systemInfo
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */
const monitor = require('pofresh-monitor');

const DEFAULT_INTERVAL = 5 * 60; // in second
const DEFAULT_DELAY = 10; // in second

const moduleId = 'systemInfo';

module.exports = function (opts) {
    return new Module(opts);
};

module.exports.moduleId = moduleId;

class Module {
    constructor(opts) {
        opts = opts || {};
        this.type = opts.type || 'pull';
        this.interval = opts.interval || DEFAULT_INTERVAL;
        this.delay = opts.delay || DEFAULT_DELAY;
    }

    monitorHandler(agent) {
        //collect data
        monitor.sysmonitor.getSysInfo((err, data) => {
            agent.notify(moduleId, { serverId: agent.id, body: data });
        });
    }

    masterHandler(agent, msg) {
        if (!msg) {
            agent.notifyAll(moduleId);
            return;
        }

        const body = msg.body;

        const oneData = {
            Time: body.iostat.date,
            hostname: body.hostname,
            serverId: msg.serverId,
            cpuUser: body.iostat.cpu.cpu_user,
            cpuNice: body.iostat.cpu.cpu_nice,
            cpuSystem: body.iostat.cpu.cpu_system,
            cpuIowait: body.iostat.cpu.cpu_iowait,
            cpuSteal: body.iostat.cpu.cpu_steal,
            cpuIdle: body.iostat.cpu.cpu_idle,
            tps: body.iostat.disk.tps,
            kbRead: body.iostat.disk.kb_read,
            kbWrtn: body.iostat.disk.kb_wrtn,
            kbReadPer: body.iostat.disk.kb_read_per,
            kbWrtnPer: body.iostat.disk.kb_wrtn_per,
            totalmem: body.totalmem,
            freemem: body.freemem,
            'free/total': body.freemem / body.totalmem,
            m1: body.loadavg[0],
            m5: body.loadavg[1],
            m15: body.loadavg[2]
        };

        let data = agent.get(moduleId);
        if (!data) {
            data = {};
            agent.set(moduleId, data);
        }

        data[msg.serverId] = oneData;
    }

    clientHandler(agent, msg, cb) {
        cb(null, agent.get(moduleId) || {});
    }
}
