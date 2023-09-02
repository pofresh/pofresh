/*!
 * pofresh -- consoleModule runScript
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */
const logger = require('pofresh-logger').getLogger('pofresh-admin', __filename);
const vm = require('vm');
const fs = require('fs');
const util = require('util');
const path = require('path');

const moduleId = "scripts";

module.exports = function (opts) {
    return new Module(opts);
};

module.exports.moduleId = moduleId;

class Module {
    constructor(opts) {
        this.app = opts.app;
        this.root = opts.path;
        this.commands = {
            list,
            get,
            save,
            run
        };
    }

    monitorHandler(agent, msg, cb) {
        const context = {
            app: this.app,
            require,
            os: require('os'),
            fs: require('fs'),
            process,
            util
        };
        try {
            vm.runInNewContext(msg.script, context);

            const result = context.result;
            if (!result) {
                cb(null, "script result should be assigned to result value to script module context");
            } else {
                cb(null, result);
            }
        } catch (e) {
            cb(null, e.toString());
        }
    }

    clientHandler(agent, msg, cb) {
        const fun = this.commands[msg.command];
        if (!fun || typeof fun !== 'function') {
            cb('unknown command:' + msg.command);
            return;
        }

        fun(this, agent, msg, cb);
    }
}

/**
 * List server id and scripts file name
 */
function list(scriptModule, agent, msg, cb) {
    const servers = [];
    const scripts = [];
    const idMap = agent.idMap;

    for (let sid in idMap) {
        servers.push(sid);
    }

    fs.readdir(scriptModule.root, function (err, filenames) {
        if (err) {
            filenames = [];
        }

        filenames.forEach(filename => scripts.push(filename));

        cb(null, {
            servers: servers,
            scripts: scripts
        });
    });
}

/**
 * Get the content of the script file
 */
function get(scriptModule, agent, msg, cb) {
    const filename = msg.filename;
    if (!filename) {
        cb('empty filename');
        return;
    }

    fs.readFile(path.join(scriptModule.root, filename), 'utf-8', function (err, data) {
        if (err) {
            logger.error('fail to read script file:' + filename + ', ' + err.stack);
            cb('fail to read script with name:' + filename);
        }

        cb(null, data);
    });
}

/**
 * Save a script file that posted from admin console
 */
function save(scriptModule, agent, msg, cb) {
    const filepath = path.join(scriptModule.root, msg.filename);
    fs.writeFile(filepath, msg.body, function (err) {
        if (err) {
            logger.error('fail to write script file:' + msg.filename + ', ' + err.stack);
            cb('fail to write script file:' + msg.filename);
            return;
        }
        cb();
    });
}

/**
 * Run the script on the specified server
 */
function run(scriptModule, agent, msg, cb) {
    agent.request(msg.serverId, moduleId, msg, function (err, res) {
        if (err) {
            logger.error('fail to run script for ' + err.stack);
            return;
        }
        cb(null, res);
    });
}
