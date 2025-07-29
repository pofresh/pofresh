const fs = require('fs');
const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const commandId = 'exec';
const helpCommand = 'help exec';

module.exports.commandId = commandId;
module.exports.helpCommand = helpCommand;

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const Context = agent.getContext();
        if (Context === 'all') {
            util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
            rl.prompt();
            return;
        }

        const argvs = util.argsFilter(argv);

        if (argvs.length > 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let file = null;
        const path = require('path');

        // Handle both Unix and Windows paths
        if (!path.isAbsolute(comd)) {
            comd = path.join(process.cwd(), comd);
        }

        try {
            file = fs.readFileSync(comd, 'utf8');
        } catch (_e) {
            util.log('\nError reading script file: ' + _e.message + '\n');
            rl.prompt();
            return;
        }

        client.request(
            'scripts',
            {
                command: 'run',
                serverId: Context,
                script: file
            },
            function (err, msg) {
                if (err) {
                    util.log('Error executing script: ' + err);
                } else {
                    try {
                        const parsedMsg = JSON.parse(msg);
                        util.formatOutput(commandId, parsedMsg);
                    } catch {
                        // If not JSON, display as plain text
                        util.log('\n' + msg + '\n');
                    }
                }
                rl.prompt();
            }
        );
    }
}
