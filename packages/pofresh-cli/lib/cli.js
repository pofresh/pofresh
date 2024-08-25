const readline = require('readline');
const adminClient = require('pofresh-admin').adminClient;
const command = require('./command')();
const consts = require('./consts');
const util = require('./util');
const argv = require('optimist').argv;

const username = argv.u = argv.u || 'monitor';
const password = argv.p = argv.p || 'monitor';
const host = argv.h = argv.h || 'localhost';
const port = argv.P = argv.P || 3005;
const context = 'all';
let client = null;

module.exports = doConnect;

function doConnect() {
    client = new adminClient({
        username: username,
        password: password,
        md5: true
    });
    let id = 'pofresh_cli_' + Date.now();
    client.connect(id, host, port, function (err) {
        if (err) {
            util.log('\n' + err + '\n');
            process.exit(0);
        } else {
            consts.ASCII_LOGO.forEach(logo => util.log(logo));
            consts.WELCOME_INFO.forEach(info => util.log(info));
            startCli();
        }
    });

    client.on('disconnect', function () {
        util.log('\ndisconnect from master');
        process.exit(0);
    });

    client.on('close', function () {
        client.socket.disconnect();
        util.log('\ndisconnect from master');
        process.exit(0);
    });
}

function startCli() {
    const rl = readline.createInterface(process.stdin, process.stdout, completer);
    const PROMPT = username + consts.PROMPT + context + '>';
    rl.setPrompt(PROMPT);
    rl.prompt();

    rl.on('line', function (line) {
        const key = line.trim();
        if (!key) {
            util.help();
            rl.prompt();
            return;
        }
        switch (key) {
            case 'help':
                util.help();
                rl.prompt();
                break;
            case '?':
                util.help();
                rl.prompt();
                break;
            case 'quit':
                command.quit(rl);
                break;
            case 'kill':
                command.kill(rl, client);
                break;
            default:
                command.handle(key, {user: username}, rl, client);
                break;
        }
    }).on('close', function () {
        util.log('bye ' + username);
        process.exit(0);
    });
}

function completer(line) {
    line = line.trim();
    const completions = consts.COMANDS_COMPLETE;
    let hits = [];
    // commands tab for infos
    if (consts.COMPLETE_TWO[line]) {
        if (line === "show") {
            for (const k in consts.SHOW_COMMAND) {
                hits.push(k);
            }
        } else if (line === "help") {
            for (const k in consts.COMANDS_COMPLETE_INFO) {
                hits.push(k);
            }
        } else if (line === "enable" || line === "disable") {
            hits.push("app");
            hits.push("module");
        } else if (line === "dump") {
            hits.push("memory");
            hits.push("cpu");
        }
    }

    hits = util.tabComplete(hits, line, consts.COMANDS_COMPLETE_INFO, "complete");
    hits = util.tabComplete(hits, line, consts.COMANDS_COMPLETE_INFO, "help");
    hits = util.tabComplete(hits, line, consts.SHOW_COMMAND, "show");
    hits = util.tabComplete(hits, line, null, "enable");
    hits = util.tabComplete(hits, line, null, "disable");
    hits = util.tabComplete(hits, line, null, "disable");
    hits = util.tabComplete(hits, line, null, "dump");
    hits = util.tabComplete(hits, line, null, "use");
    hits = util.tabComplete(hits, line, null, "stop");

    // show all completions if none found
    return [hits.length ? hits : completions, line];
}