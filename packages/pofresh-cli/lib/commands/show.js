const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const helpCommand = 'help show';

module.exports.commandId = 'show';
module.exports.helpCommand = helpCommand

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const Context = agent.getContext();
        const argvs = util.argsFilter(argv);
        let param = "";

        if (argvs.length > 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        if (Context === 'all' && consts.CONTEXT_COMMAND[comd]) {
            util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
            rl.prompt();
            return;
        }

        if (!consts.SHOW_COMMAND[comd]) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }
        client.request('watchServer', {
            comd: comd,
            param: param,
            context: Context
        }, function (err, data) {
            if (err) console.log(err);
            else util.formatOutput(comd, data);
            rl.prompt();
        });
    }
}