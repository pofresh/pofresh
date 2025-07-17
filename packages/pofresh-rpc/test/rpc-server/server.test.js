import { describe, it, expect } from 'vitest';
import { server as Server } from '../../index.js';

const WAIT_TIME = 100;

const paths = [
  { namespace: 'user', path: __dirname + '/../mock-remote/area' },
  { namespace: 'sys', path: __dirname + '/../mock-remote/connector' }
];

const port = 3333;

describe('server', () => {
  describe('#create', () => {
    it('should create gateway by providing port and paths parameters', (done) => {
      const opts = {
        paths: paths,
        port: port
      };

      let errorCount = 0;
      let closeCount = 0;
      const gateway = Server.create(opts);

      expect(gateway).toBeDefined();
      gateway.on('error', err => {
        errorCount++;
      });
      gateway.on('closed', () => {
        closeCount++;
      });

      gateway.start();
      gateway.stop();

      setTimeout(() => {
        expect(errorCount).toBe(0);
        expect(closeCount).toBe(1);
        done();
      }, WAIT_TIME);
    });

    it('should change the default acceptor by pass the acceptorFactory to the create function', (done) => {
      const oport = 3333;
      let constructCount = 0,
        listenCount = 0,
        closeCount = 0;

      class MockAcceptor {
        constructor(opts, cb) {
          constructCount++;
        }

        listen(port) {
          expect(port).toBe(oport);
          listenCount++;
        }

        close() {
          closeCount++;
        }

        on() {}

        emit() {}
      }

      const acceptorFactory = {
        create: function(opts, cb) {
          return new MockAcceptor(null, cb);
        }
      };

      const opts = {
        paths: paths,
        port: oport,
        acceptorFactory: acceptorFactory
      };

      const gateway = Server.create(opts);

      expect(gateway).toBeDefined();

      gateway.start();
      gateway.stop();

      setTimeout(() => {
        expect(constructCount).toBe(1);
        expect(listenCount).toBe(1);
        expect(closeCount).toBe(1);
        done();
      }, WAIT_TIME);
    });
  });
});