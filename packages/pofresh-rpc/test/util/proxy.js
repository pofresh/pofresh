const lib = process.env.POFRESH_RPC_COV ? 'lib-cov' : 'lib';
const should = require('should');
const Proxy = require('../../' + lib + '/util/proxy');

const A = function(value) {
  this.value = value;
};
A.prototype.add = function(num) {
  this.value += num;
};
A.prototype.sub = function(num) {
  this.value -= num;
};
A.prototype.addB = function() {
  this.b.value++;
};
A.prototype.addInternal = function() {
  this.add(1);
};

const B = function(value) {
  this.value = value;
};
B.prototype.addA = function() {
  this.a.value++;
};

const callback = function(service, method, args, attach, invoke) {};

describe('proxy', function() {
  describe('#create', function() {
    it('should invoke the proxy function if it had been set', function() {
      let callbackCount = 0;
      const cb = function(service, method, args, attach, invoke) {
        callbackCount++;
      };
      const a = new A(1);

      const proxy = Proxy.create({
        service: 'A',
        origin: a,
        proxyCB: cb
      });
      proxy.add(1);
      callbackCount).toBe(1);
    });

    it('should invoke the origin function if the proxy function not set', function() {
      const value = 1;
      const a = new A(value);

      const proxy = Proxy.create({
        origin: a
      });
      proxy.add(1);
      a.value).toBe(value + 1);
    });

    it('should invoke the origin function if the invoke callback had been called in proxy function', function() {
      let callbackCount = 0;
      let originCallCount = 0;
      const value = 1;

      const cb = function(namespace, method, args, attach, invoke) {
        callbackCount++;
        console.log('back', namespace, method, args, attach, invoke);
      };
      const a = new A(value);
      a.add = function(num) {
        originCallCount++;
        this.value += num;
      };

      //overwrite the origin function
      const proxy = Proxy.create({
        origin: a,
        proxyCB: cb
      });
      console.log('proxy', proxy);

      proxy.add(2, () => console.log(arguments));
      console.log('callbackCount', callbackCount);
      console.log('a', a.value);

      callbackCount).toBe(1);
      originCallCount).toBe(1);
      a.value).toBe(value + 1);
    });

    // it('should not invoke the origin function if the invoke callback not called', function () {
    //     var callbackCount = 0;
    //     var originCallCount = 0;
    //     var value = 1;
    //
    //     var cb = function (namespace, method, args, attach, invoke) {
    //         callbackCount++;
    //     };
    //     var a = new A(value);
    //     //overwrite the origin function
    //     a.add = function (num) {
    //         originCallCount++;
    //         this.value += this.value;
    //     };
    //
    //     var proxy = Proxy.create({
    //         origin: a,
    //         proxyCB: cb
    //     });
    //     proxy.add(1);
    //
    //     callbackCount).toBe(1);
    //     originCallCount).toBe(0);
    //     a.value).toBe(value);
    // });
    //
    // it('should flush the operation result on fields to the origin object', function () {
    //     var value = 1;
    //
    //     var a = new A(value);
    //     var proxy = Proxy.create({
    //         origin: a
    //     });
    //
    //     proxy.value++;
    //
    //     proxy.value).toBe(value + 1);
    //     a.value).toBe(value + 1);
    // });
    //
    // it('should be ok if create proxies for two objects that references each other', function () {
    //     var callbackCount = 0;
    //     var valueA = 1;
    //     var valueB = 2;
    //
    //     var cb = function (namespace, method, args, attach, invoke) {
    //         callbackCount++;
    //         // invoke(args);
    //     };
    //     var a = new A(valueA);
    //     var b = new B(valueB);
    //
    //     var proxyA = Proxy.create({
    //         origin: a,
    //         proxyCB: cb
    //     });
    //     var proxyB = Proxy.create({
    //         origin: b,
    //         proxyCB: cb
    //     });
    //     a.b = b;
    //     b.a = a;
    //     proxyA.addB();
    //     proxyB.addA();
    //
    //     callbackCount).toBe(2);
    //     a.value).toBe(valueA + 1);
    //     b.value).toBe(valueB + 1);
    // });
    //
    // it('should not proxy the internal invoking', function () {
    //     var callbackCount = 0;
    //     var value = 1;
    //
    //     var cb = function (namespace, method, args, attach, invoke) {
    //         callbackCount++;
    //         // invoke(args);
    //     };
    //     var a = new A(value);
    //
    //     var proxy = Proxy.create({
    //         origin: a,
    //         proxyCB: cb
    //     });
    //     proxy.addInternal(1);
    //
    //     callbackCount).toBe(1);
    //     a.value).toBe(value + 1);
    // });
    //
    // it('should has the same class info with origin object', function () {
    //     var a = new A(1);
    //
    //     var proxy = Proxy.create({
    //         origin: a
    //     });
    //
    //     proxy.should.be.an.instanceof(A);
    // });
    //
    // it('should pass the attach from opts to invoke callback', function () {
    //     var callbackCount = 0;
    //     var expectAttach = {someValue: 1, someObject: {}, someStr: "hello"};
    //
    //     var cb = function (namespace, method, args, attach, invoke) {
    //         callbackCount++;
    //         expect(attach);
    //         attach).toBe(expectAttach);
    //     };
    //     var a = new A(1);
    //
    //     var proxy = Proxy.create({
    //         origin: a,
    //         proxyCB: cb,
    //         attach: expectAttach
    //     });
    //     proxy.addInternal(1);
    //
    //     callbackCount).toBe(1);
    // });
  });
});
