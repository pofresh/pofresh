const fs = require('fs');
const consts = require('./consts');
const util = require('./util');

class Command {
    constructor() {
        this.commands = {};
        this.init();
        this.context = 'all';
    }

    init() {
        fs.readdirSync(__dirname + '/commands').forEach(filename => {
            if (/\.js$/.test(filename)) {
                const name = filename.substring(0, filename.lastIndexOf('.'));
                this.commands[name] = require('./commands/' + name);
            }
        });
    }

    handle(argv, msg, rl, client) {
        const argvs = util.argsFilter(argv);
        const comd = argvs[0];
        let comd1 = argvs[1] || "";

        comd1 = comd1.trim();
        const m = this.commands[comd];
        if (m) {
            const _command = m();
            _command.handle(this, comd1, argv, rl, client, msg);
        } else {
            util.errorHandle(argv, rl);
        }
    }

    quit(rl) {
        rl.emit('close');
    }

    kill(rl, client) {
        rl.question(consts.KILL_QUESTION_INFO, function (answer) {
            if (answer === 'yes') {
                client.request(consts.CONSOLE_MODULE, {
                    signal: "kill"
                }, function (err) {
                    if (err) console.log(err);
                    rl.prompt();
                });
            } else {
                rl.prompt();
            }
        });
    }

    getContext() {
        return this.context;
    }

    setContext(context) {
        this.context = context;
    }

}

module.exports = function () {
    return new Command();
}