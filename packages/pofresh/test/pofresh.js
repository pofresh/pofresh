const path = require('path');
const pofresh = require('../index');
const should = require('should');

const mockBase = path.join(process.cwd(), 'test');
describe('pofresh', function() {
  describe('#createApp', function() {
    it('should create and get app, be the same instance', function(done) {
      const app = pofresh.createApp({ base: mockBase });
      should.exist(app);

      const app2 = pofresh.app;
      should.exist(app2);
      should.strictEqual(app, app2);
      done();
    });
  });
});
