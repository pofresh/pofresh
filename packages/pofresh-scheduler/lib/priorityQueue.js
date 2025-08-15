/**
 * Modern PriorityQueue class with enhanced performance and safety
 */
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');

class PriorityQueue {
    constructor(comparator) {
        this.init(comparator);
    }

    /**
     * Initialize the priority queue
     * @param {Function} comparator - Comparison function
     */
    init(comparator) {
        this._comparator = typeof comparator === 'function' ? comparator : this._defaultComparator;
        this._queue = [];
        this._tailPos = 0;
        this._maxSize = Constants.DEFAULT_SETTINGS.MAX_JOB_COUNT;
        this._stats = {
            offers: 0,
            pops: 0,
            peeks: 0,
            maxSize: 0
        };
    }

    /**
     * Return the size of the priority queue
     * @returns {number} PriorityQueue size
     */
    size() {
        return this._tailPos;
    }

    /**
     * Check if the queue is empty
     * @returns {boolean} True if queue is empty
     */
    isEmpty() {
        return this._tailPos === 0;
    }

    /**
     * Check if the queue is full
     * @returns {boolean} True if queue is full
     */
    isFull() {
        return this._tailPos >= this._maxSize;
    }

    /**
     * Insert an element to the queue with validation
     * @param {*} element - The element to insert
     * @returns {boolean} True if element was inserted successfully
     */
    offer(element) {
        try {
            // Input validation
            if (element === undefined || element === null) {
                throw new Error('Element cannot be null or undefined');
            }

            // Check queue capacity
            if (this.isFull()) {
                throw new Error('Priority queue is full');
            }

            const queue = this._queue;
            const compare = this._comparator;

            // Add element to the end
            queue[this._tailPos] = element;
            this._tailPos++;

            // Heapify up
            this._heapifyUp(this._tailPos - 1);

            // Update statistics
            this._stats.offers++;
            this._stats.maxSize = Math.max(this._stats.maxSize, this._tailPos);

            return true;
        } catch (err) {
            console.error('Failed to offer element to priority queue:', err);
            return false;
        }
    }

    /**
     * Get and remove the first element in the queue
     * @returns {*} The first element or null if queue is empty
     */
    pop() {
        if (this._tailPos === 0) {
            return null;
        }

        try {
            const queue = this._queue;

            // Get the head element
            const headNode = queue[0];

            // Move the last element to the head
            const tail = queue[this._tailPos - 1];
            queue[0] = tail;
            this._tailPos--;

            // Remove the last element reference
            queue[this._tailPos] = undefined;

            // Heapify down if there are elements left
            if (this._tailPos > 0) {
                this._heapifyDown(0);
            }

            // Update statistics
            this._stats.pops++;

            return headNode;
        } catch (err) {
            console.error('Failed to pop element from priority queue:', err);
            return null;
        }
    }

    /**
     * Get but not remove the first element in the queue
     * @returns {*} The first element or null if queue is empty
     */
    peek() {
        if (this._tailPos === 0) {
            return null;
        }

        this._stats.peeks++;
        return this._queue[0];
    }

    /**
     * Remove a specific element from the queue
     * @param {*} element - Element to remove
     * @returns {boolean} True if element was found and removed
     */
    remove(element) {
        const index = this._queue.indexOf(element);
        if (index === -1 || index >= this._tailPos) {
            return false;
        }

        // Move the last element to the removed position
        this._queue[index] = this._queue[this._tailPos - 1];
        this._tailPos--;
        this._queue[this._tailPos] = undefined;

        // Rebalance the heap
        if (index < this._tailPos) {
            this._heapifyUp(index);
            this._heapifyDown(index);
        }

        return true;
    }

    /**
     * Clear all elements from the queue
     */
    clear() {
        this._queue.length = 0;
        this._tailPos = 0;
        this._stats.offers = 0;
        this._stats.pops = 0;
        this._stats.peeks = 0;
        this._stats.maxSize = 0;
    }

    /**
     * Get all elements in the queue as an array
     * @returns {Array} Copy of all elements in the queue
     */
    toArray() {
        return this._queue.slice(0, this._tailPos);
    }

    /**
     * Get queue statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this._stats,
            currentSize: this._tailPos,
            maxSize: this._maxSize
        };
    }

    /**
     * Validate the heap property
     * @returns {boolean} True if heap property is valid
     */
    validate() {
        for (let i = 0; i < this._tailPos; i++) {
            const left = i * 2 + 1;
            const right = left + 1;

            if (left < this._tailPos && this._comparator(this._queue[i], this._queue[left])) {
                return false;
            }

            if (right < this._tailPos && this._comparator(this._queue[i], this._queue[right])) {
                return false;
            }
        }
        return true;
    }

    /**
     * Heapify up from the given position
     * @param {number} pos - Position to start heapifying up from
     * @private
     */
    _heapifyUp(pos) {
        const queue = this._queue;
        const compare = this._comparator;
        const element = queue[pos];

        while (pos > 0) {
            const parentPos = Math.floor((pos - 1) / 2);
            const parent = queue[parentPos];

            if (!compare(parent, element)) {
                break;
            }

            // Swap with parent
            queue[pos] = parent;
            queue[parentPos] = element;
            pos = parentPos;
        }
    }

    /**
     * Heapify down from the given position
     * @param {number} pos - Position to start heapifying down from
     * @private
     */
    _heapifyDown(pos) {
        const queue = this._queue;
        const compare = this._comparator;
        const element = queue[pos];
        const length = this._tailPos;

        while (pos < length) {
            let smallest = pos;
            const left = pos * 2 + 1;
            const right = left + 1;

            // Compare with left child
            if (left < length && compare(queue[smallest], queue[left])) {
                smallest = left;
            }

            // Compare with right child
            if (right < length && compare(queue[smallest], queue[right])) {
                smallest = right;
            }

            // If current position is the smallest, we're done
            if (smallest === pos) {
                break;
            }

            // Swap with smallest child
            queue[pos] = queue[smallest];
            queue[smallest] = element;
            pos = smallest;
        }
    }

    /**
     * Default comparator for min-heap
     * @param {*} a - First element
     * @param {*} b - Second element
     * @returns {boolean} True if a should come after b
     * @private
     */
    _defaultComparator(a, b) {
        return a > b;
    }
}

/**
 * Factory function to create a PriorityQueue instance
 * @param {Function} comparator - Optional comparison function
 * @returns {PriorityQueue} New PriorityQueue instance
 */
function createPriorityQueue(comparator) {
    return new PriorityQueue(comparator);
}

module.exports = {
    PriorityQueue,
    createPriorityQueue
};
