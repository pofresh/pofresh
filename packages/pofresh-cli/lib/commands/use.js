const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const helpCommand = 'help use';

module.exports.commandId = 'use';
module.exports.helpCommand = helpCommand;

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        let Context = agent.getContext();
        const argvs = util.argsFilter(argv);

        if (argvs.length > 2) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const user = msg.user || 'admin';

        if (comd === 'all') {
            util.log('\nswitch to server: ' + comd + '\n');
            Context = comd;
            agent.setContext(Context);
            const PROMPT = user + consts.PROMPT + Context + '>';
            rl.setPrompt(PROMPT);
            rl.prompt();
            return;
        }

        client.request('watchServer', {
            comd: 'servers',
            context: Context
        }, function (err, data) {
            if (err) console.log(err);
            else {
                const _msg = data['msg'];
                if (_msg[comd]) {
                    util.log('\nswitch to server: ' + comd + '\n');
                    Context = comd;
                    agent.setContext(Context);
                    const PROMPT = user + consts.PROMPT + Context + '>';
                    rl.setPrompt(PROMPT);
                } else {
                    util.log('\ncommand \'use ' + comd + '\' error for serverId ' + comd + ' not in pofresh clusters\n');
                }
            }
            rl.prompt();
        });
    }
}