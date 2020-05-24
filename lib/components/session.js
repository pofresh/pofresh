let SessionService = require('../common/service/sessionService');

module.exports = function (app, opts) {
    let service = new SessionService(app, opts);
    service.name = '__session__';
    app.set('sessionService', service, true);
    return service;
};