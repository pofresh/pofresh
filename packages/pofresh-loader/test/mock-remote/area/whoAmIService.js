/**
 * Mock remote service
 */
module.exports = function (app) {
    return {
        doService(cb) {
            cb(null, app.id);
        },
        name: 'whoAmIRemote'
    };
};