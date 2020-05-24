const utils = require('../util/utils');

class Service {
    constructor(app, opts) {
        this.app = app;
    }

    schedule(reqId, route, msg, recvs, opts, cb) {
        opts = opts || {};
        if (opts.type === 'broadcast') {
            doBroadcast(this, msg, opts.userOptions);
        } else {
            doBatchPush(this, msg, recvs);
        }

        if (cb) {
            process.nextTick(function () {
                utils.invokeCallback(cb);
            });
        }
    }

}

module.exports = Service;

function doBroadcast(self, msg, opts) {
    let channelService = self.app.get('channelService');
    let sessionService = self.app.get('sessionService');

    if (opts.binded) {
        sessionService.forEachBindedSession(function (session) {
            if (channelService.broadcastFilter &&
                !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                return;
            }

            sessionService.sendMessageByUid(session.uid, msg);
        });
    } else {
        sessionService.forEachSession(function (session) {
            if (channelService.broadcastFilter &&
                !channelService.broadcastFilter(session, msg, opts.filterParam)) {
                return;
            }

            sessionService.sendMessage(session.id, msg);
        });
    }
}

function doBatchPush(self, msg, recvs) {
    let sessionService = self.app.get('sessionService');
    for (let i = 0, l = recvs.length; i < l; i++) {
        sessionService.sendMessage(recvs[i], msg);
    }
}
