const util = require('../util');
const consts = require('../consts');

module.exports = opts => new Command(opts);

const helpCommand = 'help stop';

module.exports.commandId = 'stop';
module.exports.helpCommand = helpCommand;

class Command {
    handle(agent, comd, argv, rl, client, msg) {
        if (!comd) {
            agent.handle(helpCommand, msg, rl, client);
            return;
        }

        const argvs = util.argsFilter(argv);

        let ids = [];
        if (comd !== 'all') {
            ids = argvs.slice(1);
        }

        rl.question(consts.STOP_QUESTION_INFO, answer => {
            if (answer === 'yes') {
                client.request(
                    consts.CONSOLE_MODULE,
                    {
                        signal: 'stop',
                        ids
                    },
                    (err, data) => {
                        if (err) {
                            util.log(`Error stopping server: ${err}`);
                        } else {
                            util.formatOutput(comd, data);
                            util.log('Server stopped successfully');
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
