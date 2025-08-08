/*!
 * pofresh -- consoleModule monitorLog
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */
const logger = require('pofresh-logger').getLogger('pofresh-admin', __filename);
const path = require('path');
const utils = require('../util/utils');

const DEFAULT_INTERVAL = 5 * 60; // in second
const moduleId = 'monitorLog';

module.exports = opts => new Module(opts);

module.exports.moduleId = moduleId;

/**
 * Initialize a new 'Module' with the given 'opts'
 *
 * @class Module
 * @constructor
 * @param {object} opts
 * @api public
 */
class Module {
    constructor(opts) {
        opts = opts || {};
        this.root = opts.path;
        this.interval = opts.interval || DEFAULT_INTERVAL;
    }

    /**
     * collect monitor data from monitor
     *
     * @param {Object} agent monitorAgent object
     * @param {Object} msg client message
     * @param {Function} cb callback function
     * @api public
     */
    monitorHandler(agent, msg, cb) {
        if (!msg.logfile) {
            cb(new Error('logfile should not be empty'));
            return;
        }

        const serverId = agent.id;
        fetchLogs(this.root, msg, data => {
            cb(null, { serverId, body: data });
        });
    }

    /**
     * Handle client request
     *
     * @param {Object} agent masterAgent object
     * @param {Object} msg client message
     * @param {Function} cb callback function
     * @api public
     */
    clientHandler(agent, msg, cb) {
        agent.request(msg.serverId, moduleId, msg, (err, res) => {
            if (err) {
                logger.error('fail to run log for ' + err.stack);
                return;
            }
            cb(null, res);
        });
    }
}

//get the latest logs
function fetchLogs(root, msg, callback) {
    const number = msg.number;
    const logfile = msg.logfile;
    const serverId = msg.serverId;
    const filePath = path.join(root, getLogFileName(logfile, serverId));

    const endLogs = [];
    utils.tail(filePath, number).then(output => {
        for (let i = 0; i < output.length; i++) {
            const item = output[i];
            let log = '';
            let last = '';
            if (logfile === 'rpc-debug') {
                last = item.slice(item.indexOf('{'));
            } else {
                log = item.replace(/^\s+|\s+$/g, '').split(/\s+/);
                last = log[log.length - 1];
            }

            if (last) {
                if (last.indexOf('\u001b') !== -1) {
                    last = last.slice(last.indexOf('m') + 1);
                }

                let json = {};
                try {
                    json = JSON.parse(last);
                } catch {
                    continue;
                }
                json.route = json.route || json.service;
                json.serverId = serverId;
                json.params = last;
                endLogs.push(json);
            }
        }

        callback({ logfile, dataArray: endLogs });
    });
}

function getLogFileName(logfile, serverId) {
    return logfile + '-' + serverId + '.log';
}
