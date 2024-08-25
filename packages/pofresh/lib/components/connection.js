const ConnectionService = require('../common/service/connectionService');

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = function (app) {
    const service = new ConnectionService(app);
    service.name = '__connection__';
    return service;
};