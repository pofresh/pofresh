const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const commandId = 'set';
const helpCommand = 'help set';

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

        if (argvs.length < 3) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const param = {
            key: argvs[1],
            value: argvs[2],
            type: argvs[3]
        };

        client.request('watchServer', {
            comd: commandId,
            param,
            context: Context
        }, function (err, data) {
            if (err) console.error(err);
            else util.formatOutput(commandId, data);
            rl.prompt();
        });
    }
}