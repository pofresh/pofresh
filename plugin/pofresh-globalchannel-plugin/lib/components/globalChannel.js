const ChannelService = require('../service/globalChannelService');

module.exports = function(app, opts) {
  const service = new ChannelService(app, opts);
  app.set('globalChannelService', service, true);
  service.name = '__globalChannel__';
  return service;
};
