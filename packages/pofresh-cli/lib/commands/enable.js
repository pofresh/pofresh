const util = require('../util');
const consts = require('../consts');

module.exports = opts => new Command(opts);

const commandId = 'enable';
const helpCommand = 'help enable';

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

        if (argvs.length > 3) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const param = argvs[2];

        if (comd === 'module') {
            client.command(commandId, param, null, (err, data) => {
                if (err) console.log(err);
                else if (data === 1) {
                    util.log('\ncommand ' + argv + ' ok\n');
                } else {
                    util.log('\ncommand ' + argv + ' bad\n');
                }
                rl.prompt();
            });
        } else if (comd === 'app') {
            client.request(
                'watchServer',
                {
                    comd: commandId,
                    param,
                    context: Context
                },
                (err, data) => {
                    if (err) console.log(err);
                    else util.log('\n' + data + '\n');
                    rl.prompt();
                }
            );
        } else {
            agent.handle(helpCommand, msg, rl, client);
        }
    }
}
