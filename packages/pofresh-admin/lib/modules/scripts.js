/*!
 * pofresh -- consoleModule runScript
 * Copyright(c) 2020 luson <ljhxai@163.com>
 * MIT Licensed
 */
const logger = require('pofresh-logger').getLogger('pofresh-admin', __filename);
const vm = require('vm');
const fs = require('fs');

const path = require('path');
const Security = require('../util/security');
const ErrorHandler = require('../util/errorHandler');

const moduleId = 'scripts';

module.exports = opts => new Module(opts);

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
        this.rateLimiter = Security.createRateLimiter({
            maxRequests: 10,
            windowMs: 60_000 // 1分钟内最多10次脚本执行
        });
    }

    monitorHandler(agent, msg, cb) {
        // 速率限制检查
        const rateLimitResult = this.rateLimiter({ ip: agent.id || 'unknown' });
        if (!rateLimitResult.allowed) {
            return ErrorHandler.safeCallback(cb, new Error('Rate limit exceeded. Please try again later.'));
        }

        // 输入验证
        const validationError = ErrorHandler.validateParams(msg, ['script'], {
            script: 'string'
        });

        if (validationError) {
            return ErrorHandler.safeCallback(cb, validationError);
        }

        const script = msg.script.trim();
        if (!script) {
            return ErrorHandler.safeCallback(cb, new Error('Script content cannot be empty'));
        }

        // 安全验证脚本内容
        const scriptValidation = Security.validateScript(script);
        if (!scriptValidation.isValid) {
            logger.warn('Unsafe script rejected:', scriptValidation.errors);
            return ErrorHandler.safeCallback(
                cb,
                new Error('Script contains unsafe content: ' + scriptValidation.errors.join(', '))
            );
        }

        // 记录警告
        if (scriptValidation.warnings.length > 0) {
            logger.warn('Script warnings:', scriptValidation.warnings);
        }

        // 使用ErrorHandler的安全异步操作
        ErrorHandler.safeAsyncOperation(
            () => {
                // 创建安全的执行上下文
                const context = Security.createSecureContext({
                    app: this.app,
                    result: undefined // 用于存储脚本结果
                });

                vm.runInNewContext(script, context, {
                    timeout: 5000,
                    displayErrors: true,
                    breakOnSigint: true
                });

                const result = context.result;
                if (result === undefined) {
                    return {
                        success: true,
                        message: 'script result should be assigned to result value to script module context',
                        warnings: scriptValidation.warnings
                    };
                }
                return {
                    success: true,
                    result,
                    warnings: scriptValidation.warnings
                };
            },
            cb,
            'Script execution'
        );
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

    for (const sid in idMap) {
        servers.push(sid);
    }

    fs.readdir(scriptModule.root, (err, filenames) => {
        if (err) {
            filenames = [];
        }

        filenames.forEach(filename => scripts.push(filename));

        cb(null, {
            servers,
            scripts
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

    fs.readFile(path.join(scriptModule.root, filename), 'utf-8', (err, data) => {
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
    fs.writeFile(filepath, msg.body, err => {
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
    agent.request(msg.serverId, moduleId, msg, (err, res) => {
        if (err) {
            logger.error('fail to run script for ' + err.stack);
            return;
        }
        cb(null, res);
    });
}
