const should = require('should');
const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const Acceptor = require('../../' + lib + '/rpc-server/acceptor');
const Client = require('../../' + lib + '/rpc-client/mailboxes/sio-mailbox');

const WAIT_TIME = 100;

const port = 3333;

const server = {
  id: 'area-server-1',
  host: '127.0.0.1',
  port: port
};

describe('acceptor', function() {
  after(done => {
    done();
    setTimeout(() => process.exit(), WAIT_TIME);
  });

  describe('#listen', function() {
    it('should be ok when listen a valid port and emit a closed event when it closed', function(done) {
      let errorCount = 0;
      let closeCount = 0;
      const acceptor = Acceptor.create(null, function(tracer, msg, cb) {});

      expect(acceptor);
      acceptor.on('error', function() {
        errorCount++;
      });
      acceptor.on('closed', function() {
        closeCount++;
      });

      acceptor.listen(port);
      acceptor.close();

      setTimeout(function() {
        errorCount).toBe(0);
        closeCount).toBe(1);
        done();
      }, WAIT_TIME);
    });

    // it('should emit an error when listen a port in use', function (done) {
    //     let errorCount = 0;
    //     let acceptor80 = Acceptor.create(null, function (tracer, msg, cb) {
    //     });
    //
    //     let acceptor = Acceptor.create(null, function (tracer, msg, cb) {
    //     });
    //
    //     expect(acceptor);
    //     acceptor.on('error', function (err) {
    //         expect(err);
    //         errorCount++;
    //     });
    //
    //     acceptor80.listen(80);
    //     acceptor.listen(80);
    //
    //     setTimeout(function () {
    //         errorCount).toBe(1);
    //         acceptor.close();
    //         acceptor80.close();
    //         done();
    //     }, WAIT_TIME);
    // });
  });

  describe('#new message callback', function() {
    it('should invoke the callback function with the same msg and return response to remote client by cb', function(done) {
      let callbackCount = 0;
      let clientCallbackCount = 0;
      const orgMsg = {
        service: 'xxx.yyy.zzz',
        method: 'someMethod',
        args: [1, 'a', { param: 100 }]
      };

      const acceptor = Acceptor.create(null, function(tracer, msg, cb) {
        msg.should.eql(orgMsg);
        callbackCount++;
        cb(null, msg);
      });

      expect(acceptor);
      acceptor.listen(port);

      const client = Client.create(server);
      client.connect(null, function() {
        client.send(null, orgMsg, null, function(log, error, backMsg) {
          backMsg[1].should.eql(orgMsg);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        callbackCount).toBe(1);
        clientCallbackCount).toBe(1);
        client.close();
        acceptor.close();
        done();
      }, WAIT_TIME);
    });

    it('should keep the relationship with request and response in batch rpc calls', function(done) {
      let callbackCount = 0;
      let clientCallbackCount = 0;
      const orgMsg1 = {
        service: 'xxx.yyy.zzz1',
        method: 'someMethod1',
        args: [1, 'a', { param: 100 }]
      };
      const orgMsg2 = {
        service: 'xxx.yyy.zzz2',
        method: 'someMethod2',
        args: [2, 'a', { param: 100 }]
      };

      const acceptor = Acceptor.create(null, function(tracer, msg, cb) {
        callbackCount++;
        cb(null, msg);
      });
      expect(acceptor);
      acceptor.listen(port);

      const client = Client.create(server);
      client.connect(null, function() {
        client.send(null, orgMsg1, null, function(log, error, backMsg) {
          backMsg[1].should.eql(orgMsg1);
          clientCallbackCount++;
        });
        client.send(null, orgMsg2, null, function(log, error, backMsg) {
          backMsg[1].should.eql(orgMsg2);
          clientCallbackCount++;
        });
      });

      setTimeout(function() {
        callbackCount).toBe(2);
        clientCallbackCount).toBe(2);
        client.close();
        acceptor.close();
        done();
      }, WAIT_TIME);
    });
  });
});
