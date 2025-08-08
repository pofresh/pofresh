const ConnectionService = require('../common/service/connectionService');

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = app => {
    const service = new ConnectionService(app);
    service.name = '__connection__';
    return service;
};
