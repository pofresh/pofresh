const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

const helpCommand = 'help blacklist'

module.exports.commandId = 'blacklist';
module.exports.helpCommand = helpCommand;

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }
        const argvs = util.argsFilter(argv);

        rl.question(consts.BLACKLIST_QUESTION_INFO, function (answer) {
            if (answer === 'yes') {
                client.request(consts.CONSOLE_MODULE, {
                    signal: 'blacklist',
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