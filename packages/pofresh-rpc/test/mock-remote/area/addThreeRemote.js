/**
 * Mock remote service
 */
class Service {
    doService(value, cb) {
        cb(null, value + 3);
    }
}
module.exports = function (_app) {
    return new Service();
};
