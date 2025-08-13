/**
 * CountDownLatch utility for synchronizing multiple concurrent operations
 * A synchronization aid that allows one or more threads to wait until
 * a set of operations being performed in other threads completes.
 */

class CountDownLatch {
    /**
     * Create a new CountDownLatch instance
     * @param {number} count - The number of times countDown() must be invoked
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Timeout in milliseconds
     * @param {function} callback - Callback function when countdown completes or times out
     */
    constructor(count, options, callback) {
        if (typeof callback === 'function') {
            this.callback = callback;
        } else if (typeof options === 'function') {
            this.callback = options;
            options = {};
        }

        if (count <= 0) {
            throw new Error('Count must be a positive number');
        }

        this.count = count;
        this.timerId = null;

        if (options.timeout) {
            this.timerId = setTimeout(() => {
                this.callback?.(true);
            }, options.timeout);
        }
    }

    /**
     * Decrements the count of the latch, releasing all waiting threads if count reaches zero
     * @throws {Error} If called more times than the initial count
     */
    done() {
        if (this.count <= 0) {
            throw new Error('CountDownLatch count cannot be negative');
        }

        this.count--;
        if (this.count === 0) {
            if (this.timerId) {
                clearTimeout(this.timerId);
            }
            this.callback?.(false);
        }
    }

    /**
     * Get the current count
     * @returns {number} The current count
     */
    getCount() {
        return this.count;
    }

    /**
     * Reset the latch to its initial count
     * @param {number} newCount - New count value
     */
    reset(newCount) {
        this.count = newCount;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
}

/**
 * Create a count down latch
 * @param {number} count - Number of countdown operations
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in milliseconds (optional)
 * @param {function} callback - Callback function
 * @returns {CountDownLatch} New CountDownLatch instance
 * @throws {Error} If count is not positive or callback is not a function
 */
function createCountDownLatch(count, options, callback) {
    if (!Number.isInteger(count) || count <= 0) {
        throw new Error('Count must be a positive integer');
    }

    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
    }

    return new CountDownLatch(count, options, callback);
}

module.exports = {
    createCountDownLatch,
    CountDownLatch
};
