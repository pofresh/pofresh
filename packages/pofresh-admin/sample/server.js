const MasterConsole = require('../lib/consoleService');
const TestModule = require('./module');
const port = 3005;
const host = '127.0.0.1';

const opts = {
  port: port,
  master: true
};

const masterConsole = MasterConsole.createMasterConsole(opts);
const myModule = TestModule();
masterConsole.register(TestModule.moduleId, myModule);

masterConsole.start(() => {});
