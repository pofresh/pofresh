const BackendSessionService = require('../common/service/backendSessionService');

module.exports = app => {
    const service = new BackendSessionService(app);
    service.name = '__backendSession__';
    app.set('backendSessionService', service, true);
    return service;
};
