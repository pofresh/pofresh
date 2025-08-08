// remote service

class Service {
    echo(msg, _data, cb) {
        cb(null, msg);
        // cb(null, msg, 'aaa' + Date.now());
        // }, 15000);
    }
}

module.exports = context => new Service(context);
