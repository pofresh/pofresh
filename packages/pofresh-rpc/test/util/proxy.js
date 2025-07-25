const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const should = require('should');
const Proxy = require('../../' + lib + '/util/proxy');

const A = function (value) {
    this.value = value;
};
A.prototype.add = function (num) {
    this.value += num;
};
A.prototype.sub = function (num) {
    this.value -= num;
};
A.prototype.addB = function () {
    this.b.value++;
};
A.prototype.addInternal = function () {
    this.add(1);
};

const B = function (value) {
    this.value = value;
};
B.prototype.addA = function () {
    this.a.value++;
};

describe('proxy', function () {
    describe('#create', function () {
        it('should invoke the proxy function if it had been set', function () {
            let callbackCount = 0;
            const cb = function () {
                callbackCount++;
            };
            const a = new A(1);

            const proxy = Proxy.create({
                service: 'A',
                origin: a,
                proxyCB: cb
            });
            proxy.add(1);
            callbackCount.should.equal(1);
        });

        it('should invoke the origin function if the proxy function not set', function () {
            const value = 1;
            const a = new A(value);

            const proxy = Proxy.create({
                origin: a
            });
            proxy.add(1);
            a.value.should.equal(value + 1);
        });

        it('should invoke the origin function if the invoke callback had been called in proxy function', function () {
            let callbackCount = 0;
            let originCallCount = 0;
            const value = 1;

            const cb = function () {
                callbackCount++;
            };
            const a = new A(value);
            a.add = function (num) {
                originCallCount++;
                this.value += num;
            };

            //overwrite the origin function
            const proxy = Proxy.create({
                origin: a,
                proxyCB: cb
            });

            proxy.add(2);

            callbackCount.should.equal(1);
            originCallCount.should.equal(1);
            a.value.should.equal(value + 2);
        });
    });
});
