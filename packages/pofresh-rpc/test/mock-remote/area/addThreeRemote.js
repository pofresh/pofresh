/**
 * Mock remote service
 */
class Service {
    doService(value, cb) {
        cb(null, value + 3);
    }
}
module.exports = _app => new Service();
