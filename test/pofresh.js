let pofresh = require('../');
let should = require('should');
let mockBase = process.cwd() + '/test';

describe('pofresh', function() {
  describe('#createApp', function() {
    it('should create and get app, be the same instance', function(done) {
      let app = pofresh.createApp({base: mockBase});
      should.exist(app);

      let app2 = pofresh.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
