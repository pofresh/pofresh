/**
 * Modern SimpleTrigger class with enhanced error handling and validation
 */
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');
const { validateTrigger } = require('./util/utils');

const SKIP_OLD_JOB = false;

/**
 * Modern SimpleTrigger class for scheduled job execution
 */
class SimpleTrigger {
    constructor(trigger, job) {
        // Validate trigger configuration
        if (!trigger || typeof trigger !== 'object') {
            throw new Error('Invalid trigger configuration');
        }

        // Set start time with validation
        this.nextTime = trigger.start || Date.now();
        if (typeof this.nextTime !== 'number' || this.nextTime < 0) {
            throw new Error('Invalid start time');
        }

        // Set period with validation
        this.period = trigger.period !== undefined ? trigger.period : -1;
        if (typeof this.period !== 'number' || this.period < -1) {
            throw new Error('Invalid period value');
        }

        // Set execution count with validation (convert 0 to -1 for infinite)
        this.count = trigger.count !== undefined ? (trigger.count === 0 ? -1 : trigger.count) : -1;
        if (typeof this.count !== 'number' || this.count < -1) {
            throw new Error('Invalid count value');
        }

        // Store job reference
        this.job = job;

        // Resource management
        this.resources = new Set();
        this.timers = new Set();

        // Statistics
        this.stats = {
            totalExecutions: 0,
            skippedExecutions: 0,
            errors: 0
        };

        // Validation state
        this.isValid = true;
    }

    /**
     * Get the current execution time of trigger
     * @returns {number} Current execution timestamp
     */
    executeTime() {
        if (!this.isValid) {
            throw new Error('Trigger is no longer valid');
        }
        return this.nextTime;
    }

    /**
     * Calculate and return the next execution time
     * @returns {number|null} Next execution timestamp or null if no more executions
     */
    nextExecuteTime() {
        if (!this.isValid) {
            throw new Error('Trigger is no longer valid');
        }

        try {
            // Check if job should stop executing
            if (this.shouldStopExecution()) {
                return null;
            }

            // Calculate next execution time
            this.nextTime += this.period;

            // Skip old executions if configured
            if (SKIP_OLD_JOB && this.nextTime < Date.now()) {
                const skippedCount = Math.floor((Date.now() - this.nextTime) / this.period);
                this.nextTime += skippedCount * this.period;
                this.stats.skippedExecutions += skippedCount;
            }

            // Validate next time is reasonable
            if (this.nextTime > Date.now() + Constants.DEFAULT_SETTINGS.MAX_FUTURE_TIME) {
                throw new Error('Next execution time exceeds maximum allowed future time');
            }

            return this.nextTime;
        } catch (err) {
            this.isValid = false;
            throw new Error(`Failed to compute next execution time: ${err.message}`);
        }
    }

    /**
     * Check if the trigger should stop executing
     * @returns {boolean} True if execution should stop
     */
    shouldStopExecution() {
        // Check count limit
        if (this.count > 0 && this.count <= this.job.runTime) {
            return true;
        }

        // Check period validity
        if (this.period <= 0) {
            return true;
        }

        return false;
    }

    /**
     * Get trigger statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            nextTime: this.nextTime,
            period: this.period,
            count: this.count,
            jobRunTime: this.job.runTime,
            isValid: this.isValid
        };
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
     * Remove a resource from tracking
     * @param {*} resource - Resource to remove
     */
    removeResource(resource) {
        this.resources.delete(resource);
    }

    /**
     * Clean up trigger resources
     */
    cleanup() {
        try {
            // Clear all timers
            if (this.timers && this.timers.size > 0) {
                for (const timer of this.timers) {
                    if (timer && typeof timer.clearTimeout === 'function') {
                        clearTimeout(timer);
                    }
                }
                this.timers.clear();
            }

            // Clear resources
            if (this.resources) {
                this.resources.clear();
            }

            // Mark as invalid
            this.isValid = false;
        } catch (err) {
            // Log error but don't throw to prevent cleanup failures
            console.error('Error during SimpleTrigger cleanup:', err);
        }
    }

    /**
     * Check if trigger is still valid
     * @returns {boolean} True if trigger is valid
     */
    isTriggerValid() {
        return this.isValid;
    }

    /**
     * Reset trigger state
     * @param {Object} newConfig - New configuration to apply
     */
    reset(newConfig) {
        try {
            // Validate new configuration
            if (newConfig) {
                validateTrigger(newConfig, 'simple');

                if (newConfig.start !== undefined) {
                    this.nextTime = newConfig.start;
                }
                if (newConfig.period !== undefined) {
                    this.period = newConfig.period;
                }
                if (newConfig.count !== undefined) {
                    this.count = newConfig.count;
                }
            }

            // Reset statistics
            this.stats.totalExecutions = 0;
            this.stats.skippedExecutions = 0;

            // Mark as valid
            this.isValid = true;
        } catch (err) {
            throw new Error(`Failed to reset trigger: ${err.message}`);
        }
    }
}

/**
 * Factory function to create SimpleTrigger instances with enhanced error handling
 * @param {Object} trigger - Trigger configuration
 * @param {Object} job - Job instance
 * @returns {SimpleTrigger} New SimpleTrigger instance
 */
function createTrigger(trigger, job) {
    try {
        // Validate inputs
        ErrorHandler.validateInput(trigger, 'object', 'Trigger');
        ErrorHandler.validateInput(job, 'object', 'Job');

        // Validate trigger configuration
        validateTrigger(trigger, 'simple');

        return new SimpleTrigger(trigger, job);
    } catch (err) {
        throw new Error(`Failed to create SimpleTrigger: ${err.message}`);
    }
}

/**
 * Validate simple trigger configuration
 * @param {Object} trigger - Trigger configuration to validate
 * @returns {boolean} True if valid
 */
SimpleTrigger.validateTrigger = function (trigger) {
    try {
        validateTrigger(trigger, 'simple');
        return true;
    } catch {
        return false;
    }
};

module.exports = {
    SimpleTrigger,
    createTrigger
};
