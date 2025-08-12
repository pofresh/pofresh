const Event = function (app) {
    this.app = app;
};

module.exports = Event;

Event.prototype.bind_session = _session => {
    // Mock implementation for testing
};
