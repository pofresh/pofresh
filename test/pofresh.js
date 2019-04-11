var pofresh = require('../');
var should = require('should');
var mockBase = process.cwd() + '/test';

describe('pofresh', function() {
  describe('#createApp', function() {
    it('should create and get app, be the same instance', function(done) {
      var app = pofresh.createApp({base: mockBase});
      should.exist(app);

      var app2 = pofresh.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
