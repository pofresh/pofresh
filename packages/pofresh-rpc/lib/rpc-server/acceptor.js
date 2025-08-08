const Acceptor = require('./acceptors/sio-acceptor');
module.exports.create = (opts, cb) => Acceptor.create(opts, cb);
