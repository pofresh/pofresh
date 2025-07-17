const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const MailStation = require('../../' + lib + '/rpc-client/mailstation');
const should = require('should');
const Server = require('../../').server;
const Tracer = require('../../lib/util/tracer');
const failureProcess = require('../../lib/rpc-client/failureProcess');

const WAIT_TIME = 100;

// proxy records
const records = [
  { namespace: 'user', serverType: 'area', path: __dirname + '../../mock-remote/area' },
  { namespace: 'sys', serverType: 'connector', path: __dirname + '../../mock-remote/connector' }
];

// server info list
const serverList = [
  { id: 'area-server-1', type: 'area', host: '127.0.0.1', port: 3333 },
  { id: 'connector-server-1', type: 'connector', host: '127.0.0.1', port: 4444 },
  { id: 'connector-server-2', type: 'connector', host: '127.0.0.1', port: 5555 }
];

// rpc description message
const msg = {
  namespace: 'user',
  serverType: 'area',
  service: 'whoAmIRemote',
  method: 'doService',
  args: []
};

describe('mail station', function() {
  let gateways = [];

  before(function(done) {
    gateways = [];
    //start remote logger
    let item, opts;
    for (let i = 0, l = serverList.length; i < l; i++) {
      item = serverList[i];
      opts = {
        paths: records,
        port: item.port,
        context: { id: item.id }
      };

      const gateway = Server.create(opts);
      gateways.push(gateway);
      gateway.start();
    }
    done();
  });

  after(function(done) {
    //stop remote servers
    for (let i = 0; i < gateways.length; i++) {
      gateways[i].stop();
    }
    done();
    setTimeout(() => process.exit(), WAIT_TIME);
  });

  describe('#create', function() {
    it('should be ok for pass an empty opts to the factory method', function(done) {
      const station = MailStation.create();
      expect(station);

      station.start(function(err) {
        should.not.exist(err);
        station.stop();
        done();
      });

      station.should.have.property('mailboxFactory');
    });

    it('should change the default mailbox by pass the mailboxFactory to the create function', function() {
      const mailboxFactory = {
        create: function(opts, cb) {
          return null;
        }
      };

      const opts = {
        mailboxFactory: mailboxFactory
      };

      const station = MailStation.create(opts);
      expect(station);

      station.should.have.property('mailboxFactory');
      station.mailboxFactory).toBe(mailboxFactory);
    });
  });

  describe('#addServer', function() {
    it('should add the server info into the mail station', function() {
      const station = MailStation.create();
      expect(station);

      let i, l;
      for (i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      let servers = station.servers,
        item,
        server;
      for (i = 0, l = serverList.length; i < l; i++) {
        item = serverList[i];
        server = servers[item.id];
        expect(server);
        server).toBe(item);
      }
    });
  });

  describe('#dispatch', function() {
    it('should send request to the right remote server and get the response from callback function', function(done) {
      let callbackCount = 0;
      let count = 0;
      const station = MailStation.create();
      expect(station);

      for (let i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const func = function(id) {
        return function(err, remoteId) {
          expect(remoteId);
          remoteId).toBe(id);
          callbackCount++;
        };
      };
      const tracer = new Tracer(null, false);

      station.start(function(err) {
        let item;
        for (let i = 0, l = serverList.length; i < l; i++) {
          count++;
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }
      });
      setTimeout(function() {
        callbackCount).toBe(count);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should send request to the right remote server and get the response from callback function', function(done) {
      let callbackCount = 0;
      let count = 0;
      const station = MailStation.create();
      expect(station);

      for (let i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const func = function(id) {
        return function(err, remoteId) {
          expect(remoteId);
          remoteId).toBe(id);
          callbackCount++;
        };
      };

      const tracer = new Tracer(null, false);

      station.start(function(err) {
        let item;
        for (let i = 0, l = serverList.length; i < l; i++) {
          count++;
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }
      });
      setTimeout(function() {
        callbackCount).toBe(count);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should update the mailbox map by add server after start', function(done) {
      let callbackCount = 0;
      const station = MailStation.create();
      expect(station);

      for (let i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const tracer = new Tracer(null, false);

      station.start(function(err) {
        // add area server
        const item = serverList[0];
        station.addServer(item);
        station.dispatch(tracer, item.id, msg, null, function(err, remoteId) {
          expect(remoteId);
          remoteId).toBe(item.id);
          callbackCount++;
        });
      });
      setTimeout(function() {
        callbackCount).toBe(1);
        station.stop();
        done();
      }, WAIT_TIME);
    });

    it('should emit error info and forward message to blackhole if fail to connect to remote server in lazy connect mode', function(done) {
      // mock data
      const serverId = 'invalid-server-id';
      const server = { id: serverId, type: 'invalid-server', host: 'localhost', port: 1234 };
      let callbackCount = 0;
      let eventCount = 0;
      const station = MailStation.create();
      expect(station);

      station.addServer(server);

      station.on('error', function(err) {
        expect(err);
        (1)).toBe(1);
        eventCount++;
      });

      station.on('error', failureProcess.bind(station));

      const tracer = new Tracer(null, false);

      station.start(function(err) {
        expect(station);
        station.dispatch(tracer, serverId, msg, null, function(err) {
          expect(err);
          'rpc failed with error code: 3').toBe(err.message);
          callbackCount++;
        });
      });
      setTimeout(function() {
        eventCount).toBe(1);
        callbackCount).toBe(1);
        station.stop();
        done();
      }, WAIT_TIME * 3);
    });
  });

  describe('#filters', function() {
    it('should invoke filters in turn', function(done) {
      let preFilterCount = 0;
      let afterFilterCount = 0;
      const sid = 'connector-server-1';
      const orgMsg = msg;
      const orgOpts = { something: 'hello' };
      const station = MailStation.create();
      expect(station);

      for (let i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const tracer = new Tracer(null, false);

      station.start(function(err) {
        station.before(function(fsid, fmsg, fopts, next) {
          preFilterCount).toBe(0);
          afterFilterCount).toBe(0);
          fsid).toBe(sid);
          fmsg).toBe(msg);
          fopts).toBe(orgOpts);
          preFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.before(function(fsid, fmsg, fopts, next) {
          preFilterCount).toBe(1);
          afterFilterCount).toBe(0);
          fsid).toBe(sid);
          fmsg).toBe(msg);
          fopts).toBe(orgOpts);
          preFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.after(function(fsid, fmsg, fopts, next) {
          preFilterCount).toBe(2);
          afterFilterCount).toBe(0);
          fsid).toBe(sid);
          fmsg).toBe(msg);
          fopts).toBe(orgOpts);
          afterFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.after(function(fsid, fmsg, fopts, next) {
          preFilterCount).toBe(2);
          afterFilterCount).toBe(1);
          fsid).toBe(sid);
          fmsg).toBe(msg);
          fopts).toBe(orgOpts);
          afterFilterCount++;
          next(fsid, fmsg, fopts);
        });

        station.dispatch(tracer, sid, orgMsg, orgOpts, function() {});
      });

      setTimeout(function() {
        preFilterCount).toBe(2);
        afterFilterCount).toBe(2);
        station.stop();
        done();
      }, WAIT_TIME);
    });
  });

  describe('#close', function() {
    it('should emit a close event for each mailbox close', function(done) {
      let closeEventCount = 0,
        i,
        l;
      const remoteIds = [];
      const mailboxIds = [];

      for (i = 0, l = serverList.length; i < l; i++) {
        remoteIds.push(serverList[i].id);
      }
      remoteIds.sort();

      const station = MailStation.create();
      expect(station);

      for (i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const func = function(id) {
        return function(err, remoteId) {
          expect(remoteId);
          remoteId).toBe(id);
        };
      };

      const tracer = new Tracer(null, false);

      station.start(function(err) {
        // invoke the lazy connect
        let item;
        for (let i = 0, l = serverList.length; i < l; i++) {
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, null, func(item.id));
        }

        station.on('close', function(mailboxId) {
          mailboxIds.push(mailboxId);
          closeEventCount++;
        });
      });

      setTimeout(function() {
        station.stop(true);
        setTimeout(function() {
          closeEventCount).toBe(remoteIds.length);
          mailboxIds.sort();
          mailboxIds.should.eql(remoteIds);
          done();
        }, WAIT_TIME);
      }, WAIT_TIME);
    });

    it('should return an error when try to dispatch message by a closed station', function(done) {
      let errorEventCount = 0;
      let i, l;

      const station = MailStation.create();
      expect(station);

      for (i = 0, l = serverList.length; i < l; i++) {
        station.addServer(serverList[i]);
      }

      const func = function(err, remoteId, attach) {
        expect(err);
        errorEventCount++;
      };

      const tracer = new Tracer(null, false);

      station.on('error', failureProcess.bind(station));

      station.start(function(err) {
        station.stop();
        let item;
        for (i = 0, l = serverList.length; i < l; i++) {
          item = serverList[i];
          station.dispatch(tracer, item.id, msg, {}, func);
        }
      });
      setTimeout(function() {
        errorEventCount).toBe(serverList.length);
        done();
      }, WAIT_TIME);
    });
  });
});
