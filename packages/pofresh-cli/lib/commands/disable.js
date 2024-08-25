const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const commandId = 'disable';
const helpCommand = 'help disable';

module.exports.commandId = 'disable';
module.exports.helpCommand = helpCommand;

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let Context = agent.getContext();
        if (Context === 'all') {
            util.log('\n' + consts.COMANDS_CONTEXT_ERROR + '\n');
            rl.prompt();
            return;
        }

        let argvs = util.argsFilter(argv);

        if (argvs.length > 3) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let param = argvs[2];

        if (comd === 'module') {
            client.command(commandId, param, null, function (err, data) {
                if (err) console.log(err);
                else {
                    if (data === 1) {
                        util.log('\ncommand ' + argv + ' ok\n');
                    } else {
                        util.log('\ncommand ' + argv + ' bad\n');
                    }
                }
                rl.prompt();
            });
        } else if (comd === 'app') {
            client.request('watchServer', {
                comd: commandId,
                param: param,
                context: Context
            }, function (err, data) {
                if (err) console.log(err);
                else util.log('\n' + data + '\n');
                rl.prompt();
            });
        } else {
            agent.handle(helpCommand, msg, rl, client);
        }
    }
}