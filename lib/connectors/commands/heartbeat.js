const Package = require('pofresh-protocol').Package;
const logger = require('pofresh-logger').getLogger('pofresh', __filename);

/**
 * Process heartbeat request.
 *
 * @param {Object} opts option request
 *                      opts.heartbeat heartbeat interval
 */
class Command {
    constructor(opts) {
        opts = opts || {};
        this.heartbeat = null;
        this.timeout = null;
        this.disconnectOnTimeout = opts.disconnectOnTimeout;

        if (opts.heartbeat) {
            this.heartbeat = opts.heartbeat * 1000; // heartbeat interval
            this.timeout = opts.timeout * 1000 || this.heartbeat * 2;      // max heartbeat message timeout
        }

        this.timeouts = {};
        this.clients = {};
    }

    handle(socket) {
        if (!this.heartbeat) {
            // no heartbeat setting
            return;
        }

        if (!this.clients[socket.id]) {
            // clear timers when socket disconnect or error
            this.clients[socket.id] = 1;
            socket.once('disconnect', clearTimers.bind(null, this, socket.id));
            socket.once('error', clearTimers.bind(null, this, socket.id));
        }

        // clear timeout timer
        if (this.disconnectOnTimeout) {
            this.clear(socket.id);
        }

        socket.sendRaw(Package.encode(Package.TYPE_HEARTBEAT));

        if (this.disconnectOnTimeout) {
            this.timeouts[socket.id] = setTimeout(function () {
                logger.info('client %j heartbeat timeout.', socket.id);
                socket.disconnect();
            }, this.timeout);
        }
    }

    clear(id) {
        let tid = this.timeouts[id];
        if (tid) {
            clearTimeout(tid);
            delete this.timeouts[id];
        }
    }
}

module.exports = Command;

function clearTimers(self, id) {
    delete self.clients[id];
    let tid = self.timeouts[id];
    if (tid) {
        clearTimeout(tid);
        delete self.timeouts[id];
    }
};
