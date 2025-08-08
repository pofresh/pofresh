const logger = require('pofresh-logger').getLogger('pofresh-admin', 'SIOServer');
const EventEmitter = require('events');
const { Server } = require('socket.io');

class SIOServer extends EventEmitter {
    constructor() {
        super();
        this.inited = false;
        this.closed = true;
    }

    listen(port) {
        if (this.inited) {
            return this.cb(new Error('already inited.'));
        }

        this.inited = true;

        this.server = new Server();

        this.server.on('connection', socket => {
            // socket.id = curId++;
            socket.send = (topic, msg) => {
                socket.emit(topic, msg);
            };
            this.emit('connection', socket);
        });

        this.server.listen(port);
        logger.info('[MasterServer] listen on %d', port);
        this.emit('listening');
        this.closed = false;
    }

    close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.server.close();
        this.emit('closed');
    }
}

module.exports = SIOServer;
