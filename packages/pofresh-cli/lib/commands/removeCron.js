const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

module.exports.commandId = 'removeCron';
module.exports.helpCommand = 'help removeCron';

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(module.exports.helpCommand, msg, rl, client);
            return;
        }

        const argvs = util.argsFilter(argv);

        rl.question(consts.ADDCRON_QUESTION_INFO, function (answer) {
            if (answer === 'yes') {
                client.request(consts.CONSOLE_MODULE, {
                    signal: 'removeCron',
                    args: argvs.slice(1)
                }, function (err, data) {
                    if (err) console.log(err);
                    else util.formatOutput(comd, data);
                    rl.prompt();
                });
            } else {
                rl.prompt();
            }
        });
    }
}