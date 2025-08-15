/**
 * Modern CronTrigger class with enhanced error handling and validation
 */
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');
const { validateTrigger } = require('./util/utils');
const decoder = require('./cronTriggerDecoder');

// Cron field indices
const SECOND = 0;
const MIN = 1;
const HOUR = 2;
const DOM = 3;
const MONTH = 4;
const DOW = 5;

/**
 * Modern CronTrigger class for cron-based job scheduling
 */
class CronTrigger {
    constructor(trigger, job) {
        // Validate inputs
        ErrorHandler.validateInput(trigger, 'string', 'Cron trigger');
        ErrorHandler.validateInput(job, 'object', 'Job');

        // Validate cron expression
        validateTrigger(trigger, 'cron');

        // Decode cron expression
        try {
            this.trigger = decoder.decodeCronTime(trigger);
            if (!this.trigger) {
                throw new Error('Failed to decode cron expression');
            }
        } catch (err) {
            throw new Error(`Invalid cron expression: ${err.message}`);
        }

        // Initialize properties
        this.job = job;
        // Note: We can't call nextExecuteTime here because it would set isValid=false on error
        // Instead, we'll initialize nextTime to null and let the first call to nextExecuteTime set it
        this.nextTime = null;

        // Resource management
        this.resources = new Set();
        this.timers = new Set();

        // Statistics
        this.stats = {
            totalExecutions: 0,
            computationTime: 0,
            errors: 0
        };

        // Validation state
        this.isValid = true;
        this.originalExpression = trigger;

        // Limits
        this.maxYear = 2999;
        this.maxIterations = 1000; // Prevent infinite loops
    }

    /**
     * Get the current execution time of trigger
     * @returns {number} Current execution timestamp
     */
    executeTime() {
        if (!this.isValid) {
            throw new Error('Trigger is no longer valid');
        }

        // If nextTime is null, compute it now
        if (this.nextTime === null) {
            this.nextTime = this.nextExecuteTime(Date.now());
        }

        return this.nextTime;
    }

    /**
     * Calculate the next valid cronTime after the given time
     * @param {number} time - Given time point (optional)
     * @returns {number|null} Nearest valid time after the given time point
     */
    nextExecuteTime(time) {
        if (!this.isValid) {
            throw new Error('Trigger is no longer valid');
        }

        const startTime = Date.now();

        try {
            // Use provided time or current next time
            time = time ? time : this.nextTime;
            time += 1000; // Add 1 second to ensure next execution

            const cronTrigger = this.trigger;
            const date = new Date(time);
            date.setMilliseconds(0);

            let iterations = 0;

            outmost: while (true) {
                iterations++;

                // Prevent infinite loops
                if (iterations > this.maxIterations) {
                    throw new Error('Maximum computation iterations exceeded');
                }

                // Check year limit
                if (date.getFullYear() > this.maxYear) {
                    throw new Error(`Cannot compute next time beyond year ${this.maxYear}`);
                }

                // Check month
                if (!decoder.timeMatch(date.getMonth(), cronTrigger[MONTH])) {
                    const nextMonth = decoder.nextCronTime(date.getMonth(), cronTrigger[MONTH]);
                    if (nextMonth === null) {
                        return null;
                    }

                    if (nextMonth <= date.getMonth()) {
                        date.setFullYear(date.getFullYear() + 1);
                        date.setMonth(0);
                        date.setDate(1);
                        date.setHours(0);
                        date.setMinutes(0);
                        date.setSeconds(0);
                        continue;
                    }

                    date.setDate(1);
                    date.setMonth(nextMonth);
                    date.setHours(0);
                    date.setMinutes(0);
                    date.setSeconds(0);
                }

                // Check day of month and day of week
                if (!this.checkDayAndWeek(date, cronTrigger)) {
                    continue outmost;
                }

                // Check hour
                if (!decoder.timeMatch(date.getHours(), cronTrigger[HOUR])) {
                    const nextHour = decoder.nextCronTime(date.getHours(), cronTrigger[HOUR]);
                    if (nextHour <= date.getHours()) {
                        date.setDate(date.getDate() + 1);
                        date.setHours(nextHour);
                        date.setMinutes(0);
                        date.setSeconds(0);
                        continue;
                    }
                    date.setHours(nextHour);
                    date.setMinutes(0);
                    date.setSeconds(0);
                }

                // Check minute
                if (!decoder.timeMatch(date.getMinutes(), cronTrigger[MIN])) {
                    const nextMinute = decoder.nextCronTime(date.getMinutes(), cronTrigger[MIN]);
                    if (nextMinute <= date.getMinutes()) {
                        date.setHours(date.getHours() + 1);
                        date.setMinutes(nextMinute);
                        date.setSeconds(0);
                        continue;
                    }
                    date.setMinutes(nextMinute);
                    date.setSeconds(0);
                }

                // Check second
                if (!decoder.timeMatch(date.getSeconds(), cronTrigger[SECOND])) {
                    const nextSecond = decoder.nextCronTime(date.getSeconds(), cronTrigger[SECOND]);
                    if (nextSecond <= date.getSeconds()) {
                        date.setMinutes(date.getMinutes() + 1);
                        date.setSeconds(nextSecond);
                        continue;
                    }
                    date.setSeconds(nextSecond);
                }

                break;
            }

            this.nextTime = date.getTime();

            // Update statistics
            this.stats.computationTime = Date.now() - startTime;
            this.stats.totalExecutions++;

            return this.nextTime;
        } catch (err) {
            this.stats.errors++;
            this.isValid = false;
            throw new Error(`Failed to compute next execution time: ${err.message}`);
        }
    }

    /**
     * Check day of month and day of week constraints
     * @param {Date} date - Date to check
     * @param {Array} cronTrigger - Cron trigger configuration
     * @returns {boolean} True if date matches constraints
     */
    checkDayAndWeek(date, cronTrigger) {
        if (
            !(decoder.timeMatch(date.getDate(), cronTrigger[DOM]) && decoder.timeMatch(date.getDay(), cronTrigger[DOW]))
        ) {
            const domLimit = decoder.getDomLimit(date.getFullYear(), date.getMonth());

            do {
                const nextDom = decoder.nextCronTime(date.getDate(), cronTrigger[DOM]);
                if (nextDom === null) {
                    return false;
                }

                // If the date is in the next month, add month
                if (nextDom <= date.getDate() || nextDom > domLimit) {
                    date.setDate(1);
                    date.setMonth(date.getMonth() + 1);
                    date.setHours(0);
                    date.setMinutes(0);
                    date.setSeconds(0);
                    return false;
                }

                date.setDate(nextDom);
            } while (!decoder.timeMatch(date.getDay(), cronTrigger[DOW]));

            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
        }

        return true;
    }

    /**
     * Get trigger statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            nextTime: this.nextTime,
            originalExpression: this.originalExpression,
            isValid: this.isValid,
            maxYear: this.maxYear
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
            console.error('Error during CronTrigger cleanup:', err);
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
     * Reset trigger with new cron expression
     * @param {string} newExpression - New cron expression
     */
    reset(newExpression) {
        try {
            // Validate new expression
            validateTrigger(newExpression, 'cron');

            // Decode new expression
            const newTrigger = decoder.decodeCronTime(newExpression);
            if (!newTrigger) {
                throw new Error('Failed to decode new cron expression');
            }

            // Update trigger
            this.trigger = newTrigger;
            this.originalExpression = newExpression;
            this.nextTime = this.nextExecuteTime(Date.now());

            // Reset statistics
            this.stats.totalExecutions = 0;
            this.stats.computationTime = 0;
            this.stats.errors = 0;

            // Mark as valid
            this.isValid = true;
        } catch (err) {
            throw new Error(`Failed to reset CronTrigger: ${err.message}`);
        }
    }

    /**
     * Validate cron expression format
     * @param {string} expression - Cron expression to validate
     * @returns {boolean} True if valid
     */
    static validateExpression(expression) {
        try {
            validateTrigger(expression, 'cron');
            const decoded = decoder.decodeCronTime(expression);
            return decoded !== null;
        } catch {
            return false;
        }
    }
}

/**
 * Factory function to create CronTrigger instances with enhanced error handling
 * @param {string} trigger - Cron trigger expression
 * @param {Object} job - Job instance
 * @returns {CronTrigger} New CronTrigger instance
 */
function createTrigger(trigger, job) {
    try {
        return new CronTrigger(trigger, job);
    } catch (err) {
        throw new Error(`Failed to create CronTrigger: ${err.message}`);
    }
}

module.exports = {
    CronTrigger,
    createTrigger
};
