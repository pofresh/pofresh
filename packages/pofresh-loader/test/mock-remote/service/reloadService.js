/**
 * Mock remote service
 */
module.exports = function () {
    return {
        id: 0,
        doService(cb) {
            this.id ++;
            cb(null, this.id);
        }
    };
};