const cliff = require('cliff');
const util = require('../util');
const consts = require('../consts');

module.exports = function (opts) {
    return new Command(opts);
};

module.exports.commandId = 'help';

class Command {
    handle(agent, comd, argv, rl) {
        if (!comd) {
            util.errorHandle(argv, rl);
            return;
        }

        const argvs = util.argsFilter(argv);

        if (argvs.length > 2) {
            util.errorHandle(argv, rl);
            return;
        }

        if (comd === 'help') {
            help();
            rl.prompt();
            return;
        }

        if (consts.COMANDS_MAP[comd]) {
            const INFOS = consts.COMANDS_MAP[comd];
            INFOS.forEach(info => util.log(info));
            rl.prompt();
            return;
        }

        util.errorHandle(argv, rl);
    }
}

function help() {
    consts.HELP_INFO_1.forEach(info => util.log(info));
    util.log(cliff.stringifyRows(consts.COMANDS_ALL));
    consts.HELP_INFO_2.forEach(info => util.log(info));
}