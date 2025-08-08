const util = require('../util');
const consts = require('../consts');

module.exports = opts => new Command(opts);

module.exports.commandId = 'removeCron';
module.exports.helpCommand = 'help removeCron';

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(module.exports.helpCommand, msg, rl, client);
            return;
        }

        const argvs = util.argsFilter(argv);

        rl.question(consts.ADDCRON_QUESTION_INFO, answer => {
            if (answer === 'yes') {
                client.request(
                    consts.CONSOLE_MODULE,
                    {
                        signal: 'removeCron',
                        args: argvs.slice(1)
                    },
                    (err, data) => {
                        if (err) {
                        } else {
                            util.formatOutput(comd, data);
                        }
                        rl.prompt();
                    }
                );
            } else {
                rl.prompt();
            }
        });
    }
}
