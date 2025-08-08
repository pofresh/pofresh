/**
 * Mock remote service
 */

module.exports = app => ({
    doService(cb) {
        cb(null, app.id);
    }
});
