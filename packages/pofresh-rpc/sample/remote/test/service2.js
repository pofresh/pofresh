// remote service

class Service {
    constructor(app) {
        console.log(app);
    }

    echo(msg, data, cb) {
        // setTimeout(function() {
        console.log('msg', msg);
        console.log('data', data);
        cb(null, msg);
        // cb(null, msg, 'aaa' + Date.now());
        // }, 15000);
    }
}

module.exports = context => new Service(context);
