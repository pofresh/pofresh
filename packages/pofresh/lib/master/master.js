const util = require('util');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const crashLogger = require('pofresh-logger').getLogger('crash-log', __filename);
const adminLogger = require('pofresh-logger').getLogger('admin-log', __filename);
const admin = require('pofresh-admin');
const utils = require('../util/utils');
const moduleUtil = require('../util/moduleUtil');
const Constants = require('../util/constants');
const starter = require('./starter');

class Server {
    constructor(app, opts) {
        opts = opts || {};
        this.app = app;
        this.masterInfo = app.getMaster();
        this.registered = {};
        this.modules = [];

        opts.port = this.masterInfo.port;
        opts.env = this.app.get(Constants.RESERVED.ENV);
        this.closeWatcher = opts.closeWatcher;
        this.masterConsole = admin.createMasterConsole(opts);
    }

    async start(cb) {
        moduleUtil.registerDefaultModules(true, this.app, this.closeWatcher);
        moduleUtil.loadModules(this, this.masterConsole);
        // start master console
        try {
            await this.masterConsole.start();
            await moduleUtil.startModules(this.modules);

            if (this.app.get(Constants.RESERVED.MODE) !== Constants.RESERVED.STAND_ALONE) {
                starter.runServers(this.app);
            }

        } catch (err) {
            throw err;
        }

        this.masterConsole.on('error', err => {
            if (err) {
                logger.error(`masterConsole encounters with error: ${err.stack}`);
            }
        });

        this.masterConsole.on('reconnect', info => {
            this.app.addServers([info]);
        });

        // monitor servers disconnect event
        this.masterConsole.on('disconnect', (id, type, info, reason) => {
            const dateTime = utils.format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            const log = util.format('[%s],[%s],[%s],[%s]', type, id, dateTime, reason || 'disconnect');
            switch (type) {
                case 'master':
                    crashLogger.error(log);
                    break;
                case 'client':
                    crashLogger.info(log);
                    break;
                default:
                    crashLogger.warn(log);
                    break;
            }

            let count = 0;
            const time = 0;
            let pingTimer = null;
            const server = this.app.getServerById(id);
            const stopFlags = this.app.get(Constants.RESERVED.STOP_SERVERS) || [];
            if (
                !!server &&
                (server[Constants.RESERVED.AUTO_RESTART] === 'true' ||
                    server[Constants.RESERVED.RESTART_FORCE] === 'true') &&
                stopFlags.indexOf(id) < 0
            ) {
                const setTimer = setTimerTime => {
                    pingTimer = setTimeout(async () => {
                        const flag = await utils.ping(server.host);
                        if (flag) {
                            await handle();
                        } else {
                            count++;
                            if (count > 3) {
                                setTimerTime = Constants.TIME.TIME_WAIT_MAX_PING;
                            } else {
                                setTimerTime = Constants.TIME.TIME_WAIT_PING * count;
                            }
                            setTimer(setTimerTime);
                        }
                    }, time);
                };
                setTimer(time);
                const handle = async () => {
                    clearTimeout(pingTimer);
                    const status = await utils.checkPort(server);
                    if (status === 'error') {
                        throw new Error('Check port command executed with error.');
                    }
                    if (status === 'busy') {
                        if (server[Constants.RESERVED.RESTART_FORCE]) {
                            starter.kill([info.pid], [server]);
                        } else {
                            throw new Error('Port occupied already, check your server to add.');
                        }
                    }
                    setTimeout(() => {
                        starter.run(this.app, server, null);
                    }, Constants.TIME.TIME_WAIT_STOP);
                };
            }
        });

        // monitor servers register event
        this.masterConsole.on('register', record => {
            starter.bindCpu(record.id, record.pid, record.host);
        });

        this.masterConsole.on('admin-log', (log, error) => {
            if (error) {
                adminLogger.error(JSON.stringify(log));
            } else {
                adminLogger.info(JSON.stringify(log));
            }
        });
    }

    stop(cb) {
        this.masterConsole.stop();
        process.nextTick(cb);
    }
}

module.exports = Server;
