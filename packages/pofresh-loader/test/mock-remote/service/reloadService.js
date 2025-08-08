/**
 * Mock remote service
 */
module.exports = () => ({
    id: 0,
    doService(cb) {
        this.id++;
        cb(null, this.id);
    }
});
