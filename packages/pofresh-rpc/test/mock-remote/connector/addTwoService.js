/**
 * Mock remote service
 */

class Service {
    constructor() {
        this.name = 'addTwoRemote';
    }

    doService(value, cb) {
        cb(null, value + 2);
    }
}

module.exports = _app => new Service();
