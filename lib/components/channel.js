const ChannelService = require('../common/service/channelService');

module.exports = function (app, opts) {
    let service = new ChannelService(app, opts);
    service.name = '__channel__';
    app.set('channelService', service, true);
    return service;
};
