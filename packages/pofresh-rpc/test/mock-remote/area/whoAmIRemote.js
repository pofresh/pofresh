/**
 * Mock remote service
 */

class Service {
    constructor(app) {
        this.app = app;
    }
    doService(cb) {
        cb(null, this.app.id);
    }
}

module.exports = app => new Service(app);
