/**
 * ErrorHandler module for pofresh-scheduler
 * Provides unified error handling and resource management
 */

class ResourceManager {
    constructor() {
        this.resources = new Set();
        this.timers = new Set();
        this.jobs = new Set();
    }

    /**
     * Add a resource to track
     * @param {*} resource - Resource to track
     */
    addResource(resource) {
        if (resource && typeof resource === 'object') {
            this.resources.add(resource);
        }
    }

    /**
     * Add a timer to track
     * @param {Timer} timer - Timer to track
     */
    addTimer(timer) {
        if (timer && typeof timer === 'object') {
            this.timers.add(timer);
        }
    }

    /**
     * Add a job to track
     * @param {Job} job - Job to track
     */
    addJob(job) {
        if (job && typeof job === 'object') {
            this.jobs.add(job);
        }
    }

    /**
     * Clean up all tracked resources
     */
    cleanup() {
        // Clear all timers
        for (const timer of this.timers) {
            if (timer && typeof timer.clearTimeout === 'function') {
                clearTimeout(timer);
            } else if (timer && typeof timer.clearInterval === 'function') {
                clearInterval(timer);
            }
        }
        this.timers.clear();

        // Clean up jobs
        for (const job of this.jobs) {
            if (job && typeof job.cleanup === 'function') {
                try {
                    job.cleanup();
                } catch (err) {
                    console.error('Error cleaning up job:', err);
                }
            }
        }
        this.jobs.clear();

        // Clear resources
        this.resources.clear();
    }
}

/**
 * Create a timeout callback with cleanup
 * @param {Function} callback - Original callback
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} context - Context for error messages
 * @returns {Object} Object with callback and cleanup method
 */
function createTimeoutCallback(callback, timeout, context) {
    let timeoutId;
    let called = false;

    const wrappedCallback = (...args) => {
        if (!called) {
            called = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            safeCallback(callback, ...args);
        }
    };

    const cleanup = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };

    timeoutId = setTimeout(() => {
        if (!called) {
            called = true;
            const error = new Error(`${context} timeout after ${timeout}ms`);
            safeCallback(callback, error);
        }
    }, timeout);

    return {
        callback: wrappedCallback,
        cleanup
    };
}

/**
 * Safely execute a callback with error handling
 * @param {Function} callback - Callback to execute
 * @param {...*} args - Arguments to pass to callback
 */
function safeCallback(callback, ...args) {
    if (typeof callback === 'function') {
        try {
            callback(...args);
        } catch (err) {
            console.error('Error in callback execution:', err);
        }
    }
}

/**
 * Validate input parameters
 * @param {*} value - Value to validate
 * @param {string} type - Expected type
 * @param {string} name - Parameter name
 * @throws {Error} If validation fails
 */
function validateInput(value, type, name) {
    if (value === undefined || value === null) {
        throw new Error(`${name} is required`);
    }

    switch (type) {
        case 'string':
            if (typeof value !== 'string' || value.trim() === '') {
                throw new Error(`${name} must be a non-empty string`);
            }
            break;
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`${name} must be a valid number`);
            }
            break;
        case 'function':
            if (typeof value !== 'function') {
                throw new Error(`${name} must be a function`);
            }
            break;
        case 'object':
            if (typeof value !== 'object' || value === null) {
                throw new Error(`${name} must be an object`);
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                throw new Error(`${name} must be an array`);
            }
            break;
    }
}

/**
 * Create a resource manager instance
 * @returns {ResourceManager} Resource manager instance
 */
function createResourceManager() {
    return new ResourceManager();
}

module.exports = {
    ResourceManager,
    createTimeoutCallback,
    safeCallback,
    validateInput,
    createResourceManager
};
