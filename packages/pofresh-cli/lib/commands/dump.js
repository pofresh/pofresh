const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const helpCommand = 'help dump';

module.exports.commandId = 'dump';
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

        if (argvs.length < 3 || (comd === 'cpu' && argvs.length < 4)) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let param = {};

        if (comd === 'memory') {
            param = {
                filepath: argvs[2],
                force: (argvs[3] === '--force')
            }
        } else if (comd === 'cpu') {
            param = {
                filepath: argvs[2],
                times: argvs[3],
                force: (argvs[4] === '--force')
            }
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