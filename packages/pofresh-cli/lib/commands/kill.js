const consts = require('../consts');

module.exports = opts => new Command(opts);

module.exports.commandId = 'kill';
module.exports.helpCommand = 'help kill';

class Command {
    handle(_agent, _comd, _argv, rl, client, _msg) {
        rl.question(consts.KILL_QUESTION_INFO, answer => {
            if (answer === 'yes') {
                client.request(
                    consts.CONSOLE_MODULE,
                    {
                        signal: 'kill'
                    },
                    (err, _data) => {
                        if (err) {
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
