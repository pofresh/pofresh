import { describe, it } from 'vitest';
import { expect } from 'vitest';
import CountDownLatch from '../../lib/util/countDownLatch.js';

const _cbCreator = (() => {
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
    let _countDownLatch1;
    let _countDownLatch2;

    describe('#count down', () => {
        it('should invoke the callback after the done method was invoked the specified times', done => {
            let n = 3,
                doneCount = 0;
            const cdl = CountDownLatch.createCountDownLatch(n, () => {
                expect(doneCount).toBe(n);
                done();
            });

            for (let i = 0; i < n; i++) {
                doneCount++;
                cdl.done();
            }
        });

        it('should throw exception if pass a negative or zero to the create method', () => {
            (() => {
                CountDownLatch.createCountDownLatch(-1, () => {
                    // Mock callback for negative count test
                });
            }).toThrow();

            (() => {
                CountDownLatch.createCountDownLatch(0, () => {
                    // Mock callback for zero count test
                });
            }).toThrow();
        });

        it('should throw exception if pass illegal cb to the create method', () => {
            (() => {
                CountDownLatch.createCountDownLatch(1, null);
            }).toThrow();
        });

        it('should throw exception if try to invoke done metho of a latch that has fired cb', () => {
            const n = 3;
            const cdl = CountDownLatch.createCountDownLatch(n, () => {
                // Mock callback for fired latch test
            });

            for (let i = 0; i < n; i++) {
                cdl.done();
            }

            (() => {
                cdl.done();
            }).toThrow();
        });

        it('should invoke the callback if timeout', () => {
            const n = 3;
            const cdl = CountDownLatch.createCountDownLatch(n, { timeout: 3000 }, isTimeout => {
                expect(isTimeout).toBe(true);
            });

            for (let i = 0; i < n - 1; i++) {
                cdl.done();
            }
        });
    });
});
