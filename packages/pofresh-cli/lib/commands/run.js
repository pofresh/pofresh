const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};
const commandId = 'run';
const helpCommand = 'help run';

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

        if (argvs.length < 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        client.request('watchServer', {
            comd: commandId,
            param: comd,
            context: Context
        }, function (err, data) {
            if (err) console.log(err);
            else util.formatOutput(commandId, data);
            rl.prompt();
        });
    }
}