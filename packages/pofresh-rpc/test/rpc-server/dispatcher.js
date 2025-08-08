const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const Dispatcher = require('../../' + lib + '/rpc-server/dispatcher');
const should = require('should');
const Tracer = require('../../lib/util/tracer');

const WAIT_TIME = 20;

const services = {
    user: {
        addOneService: {
            doService(num, cb) {
                cb(null, num + 1);
            }
        }
    },
    sys: {
        addTwoService: {
            doService(num, cb) {
                cb(null, num + 2);
            }
        }
    }
};

const tracer = new Tracer(console, false);

describe('dispatcher', () => {
    const dispatcher = new Dispatcher(services);

    it('should be find the right service object', done => {
        const methodStr = 'doService';
        const serviceStr1 = 'addOneService';
        const serviceStr2 = 'addTwoService';
        const namespace1 = 'user';
        const namespace2 = 'sys';
        const value = 1;
        let callbackCount = 0;

        const msg1 = {
            namespace: namespace1,
            service: serviceStr1,
            method: methodStr,
            args: [value]
        };
        dispatcher.route(tracer, msg1, (_err, result) => {
            expect(_err).toBeUndefined();
            expect(result).toBeDefined();
            expect(result).toBe(value + 1);
            callbackCount++;
        });

        const msg2 = {
            namespace: namespace2,
            service: serviceStr2,
            method: methodStr,
            args: [value]
        };
        dispatcher.route(tracer, msg2, (_err, result) => {
            expect(_err).toBeUndefined();
            expect(result).toBeDefined();
            expect(result).toBe(value + 2);
            callbackCount++;
        });

        //wait for all finished
        setTimeout(() => {
            expect(callbackCount).toBe(2);
            done();
        }, WAIT_TIME);
    });

    it('should return an error if the service or method not exist', done => {
        const serviceStr1 = 'addZeroService';
        const methodStr1 = 'doService';
        const serviceStr2 = 'addOneService';
        const methodStr2 = 'doOtherServcie';
        const namespace = 'user';
        const value = 1;
        let callbackCount = 0;

        const msg1 = {
            namespace,
            service: serviceStr1,
            method: methodStr1,
            args: [value]
        };
        dispatcher.route(tracer, msg1, (err, result) => {
            expect(err);
            should.not.exist(result);
            callbackCount++;
        });

        const msg2 = {
            namespace,
            service: serviceStr2,
            method: methodStr2,
            args: [value]
        };
        dispatcher.route(tracer, msg2, (err, result) => {
            expect(err);
            should.not.exist(result);
            callbackCount++;
        });

        //wait for all finished
        setTimeout(() => {
            expect(callbackCount).toBe(2);
            done();
        }, WAIT_TIME);
    });
});
