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
        if (comd[0] !== '/') {
            comd = process.cwd() + '/' + comd;
        }

        try {
            file = fs.readFileSync(comd).toString();
        } catch (e) {
            util.log(consts.COMANDS_EXEC_ERROR);
            rl.prompt();
            return;
        }

        client.request('scripts', {
            command: 'run',
            serverId: Context,
            script: file
        }, function (err, msg) {
            if (err) console.log(err);
            else {
                try {
                    msg = JSON.parse(msg);
                    util.formatOutput(commandId, msg);
                } catch (e) {
                    util.log('\n' + msg + '\n');
                }
            }
            rl.prompt();
        });
    }
}