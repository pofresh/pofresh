const consts = require('../consts');

module.exports = opts => new Command(opts);

module.exports.commandId = 'kill';
module.exports.helpCommand = 'help kill';

class Command {
    handle(agent, comd, argv, rl, client, _msg) {
        rl.question(consts.KILL_QUESTION_INFO, answer => {
            if (answer === 'yes') {
                client.request(
                    consts.CONSOLE_MODULE,
                    {
                        signal: 'kill'
                    },
                    (err, _data) => {
                        if (err) console.log(err);
                        rl.prompt();
                    }
                );
            } else {
                rl.prompt();
            }
        });
    }
}
