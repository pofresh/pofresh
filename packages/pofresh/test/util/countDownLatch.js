const CountDownLatch = require('../../lib/util/countDownLatch');
const should = require('should');

const cbCreator = (() => {
    let count = 0;

    return {
        callback() {
            count++;
        },
        getCount() {
            return count;
        },
        count
    };
})();

describe('countdown latch test', () => {
    let countDownLatch1;
    let countDownLatch2;

    describe('#count down', () => {
        it('should invoke the callback after the done method was invoked the specified times', done => {
            let n = 3,
                doneCount = 0;
            const cdl = CountDownLatch.createCountDownLatch(n, () => {
                doneCount.should.equal(n);
                done();
            });

            for (let i = 0; i < n; i++) {
                doneCount++;
                cdl.done();
            }
        });

        it('should throw exception if pass a negative or zero to the create method', () => {
            (() => {
                CountDownLatch.createCountDownLatch(-1, () => {});
            }).should.throw();

            (() => {
                CountDownLatch.createCountDownLatch(0, () => {});
            }).should.throw();
        });

        it('should throw exception if pass illegal cb to the create method', () => {
            (() => {
                CountDownLatch.createCountDownLatch(1, null);
            }).should.throw();
        });

        it('should throw exception if try to invoke done metho of a latch that has fired cb', () => {
            const n = 3;
            const cdl = CountDownLatch.createCountDownLatch(n, () => {});

            for (let i = 0; i < n; i++) {
                cdl.done();
            }

            (() => {
                cdl.done();
            }).should.throw();
        });

        it('should invoke the callback if timeout', () => {
            const n = 3;
            const cdl = CountDownLatch.createCountDownLatch(n, { timeout: 3000 }, isTimeout => {
                isTimeout.should.equal(true);
            });

            for (let i = 0; i < n - 1; i++) {
                cdl.done();
            }
        });
    });
});
