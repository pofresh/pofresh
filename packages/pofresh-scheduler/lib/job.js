/**
 * Modern Job class with enhanced error handling and resource management
 */
const CronTrigger = require('./cronTrigger');
const SimpleTrigger = require('./simpleTrigger');
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');
const { validateTrigger } = require('./util/utils');

// Global job counter for unique IDs
let globalJobIdCounter = 1;
let globalJobCount = 0;

class Job {
    constructor(trigger, jobFunc, jobData, options = {}) {
        // Input validation
        ErrorHandler.validateInput(trigger, 'object|string', 'Trigger');
        ErrorHandler.validateInput(jobFunc, 'function', 'Job function');

        this.options = {
            warnLimit: options.warnLimit || Constants.DEFAULT_SETTINGS.WARN_LIMIT,
            logger: options.logger || console,
            ...options
        };

        // Job properties
        this.data = jobData !== undefined ? jobData : null;
        this.func = jobFunc;
        this.id = globalJobIdCounter++;
        this.runTime = 0; // For backward compatibility with triggers
        this.createdAt = Date.now();
        this.lastRunAt = null;
        this.nextRunAt = null;
        this.isActive = true;

        // Create trigger based on type
        try {
            if (typeof trigger === 'string') {
                // Cron job
                validateTrigger(trigger, 'cron');
                this.type = Constants.JOB_TYPES.CRON;
                const { createTrigger } = CronTrigger;
                this.trigger = createTrigger(trigger, this);
            } else if (typeof trigger === 'object') {
                // Simple job
                validateTrigger(trigger, 'simple');
                this.type = Constants.JOB_TYPES.SIMPLE;
                const { createTrigger } = SimpleTrigger;
                this.trigger = createTrigger(trigger, this);
            } else {
                throw new Error('Invalid trigger type');
            }

            // Validate created trigger
            if (!this.trigger || typeof this.trigger.nextExecuteTime !== 'function') {
                throw new Error('Invalid trigger created');
            }

            this.nextRunAt = this.trigger.executeTime();

        } catch (err) {
            this.cleanup();
            throw new Error(`Failed to create job: ${err.message}`);
        }

        // Update global counters
        globalJobCount++;

        // Resource management
        this.resources = new Set();
        this.timers = new Set();

        this.options.logger.debug('Job created:', { 
            id: this.id, 
            type: this.type, 
            nextRunAt: this.nextRunAt 
        });
    }

    /**
     * Run the job code with enhanced error handling
     */
    run() {
        if (!this.isActive) {
            this.options.logger.warn('Attempted to run inactive job:', this.id);
            return;
        }

        const startTime = Date.now();
        const late = startTime - this.executeTime();

        try {
            globalJobCount++;
            this.runTime++;
            this.lastRunAt = startTime;

            // Log late execution
            if (late > this.options.warnLimit) {
                this.options.logger.warn(`Job ${this.id} executed late by ${late}ms`, {
                    jobId: this.id,
                    lateTime: late,
                    scheduledTime: this.executeTime(),
                    actualTime: startTime
                });
            }

            // Execute job function with timeout protection
            const timeoutId = setTimeout(() => {
                this.options.logger.error(`Job ${this.id} execution timeout`, {
                    jobId: this.id,
                    timeout: 30000 // 30 second timeout
                });
            }, 30000);

            this.timers.add(timeoutId);

            // Execute the job
            const result = this.func(this.data);

            // Clear timeout
            clearTimeout(timeoutId);
            this.timers.delete(timeoutId);

            // Calculate execution time
            const executionTime = Date.now() - startTime;
            this.options.logger.debug('Job executed successfully:', {
                jobId: this.id,
                executionTime,
                runCount: this.runTime
            });

            return result;

        } catch (err) {
            const executionTime = Date.now() - startTime;
            this.options.logger.error('Job execution failed:', {
                jobId: this.id,
                error: err.message,
                stack: err.stack,
                executionTime,
                runCount: this.runTime
            });

            // Re-throw critical errors
            if (err instanceof Error && err.name === 'CriticalError') {
                throw err;
            }
        } finally {
            // Clean up any remaining timers
            if (this.timers && this.timers.size > 0) {
                for (const timer of this.timers) {
                    clearTimeout(timer);
                }
                this.timers.clear();
            }
        }
    }

    /**
     * Compute the next execution time
     * @returns {number|null} Next execution timestamp or null if no more executions
     */
    nextTime() {
        if (!this.isActive) {
            return null;
        }

        try {
            const nextTime = this.trigger.nextExecuteTime();
            this.nextRunAt = nextTime;
            return nextTime;
        } catch (err) {
            this.options.logger.error('Error computing next execution time:', {
                jobId: this.id,
                error: err.message
            });
            return null;
        }
    }

    /**
     * Get the current execution time
     * @returns {number} Execution timestamp
     */
    executeTime() {
        return this.trigger.executeTime();
    }

    /**
     * Get job information
     * @returns {Object} Job information
     */
    getInfo() {
        return {
            id: this.id,
            type: this.type,
            runTime: this.runTime,
            isActive: this.isActive,
            createdAt: this.createdAt,
            lastRunAt: this.lastRunAt,
            nextRunAt: this.nextRunAt,
            data: this.data
        };
    }

    /**
     * Pause the job
     */
    pause() {
        this.isActive = false;
        this.options.logger.debug('Job paused:', this.id);
    }

    /**
     * Resume the job
     */
    resume() {
        this.isActive = true;
        this.options.logger.debug('Job resumed:', this.id);
    }

    /**
     * Check if job is currently active
     * @returns {boolean} True if job is active
     */
    isJobActive() {
        return this.isActive;
    }

    /**
     * Clean up job resources
     */
    cleanup() {
        try {
            // Clear all timers
            if (this.timers && this.timers.size > 0) {
                for (const timer of this.timers) {
                    clearTimeout(timer);
                }
                this.timers.clear();
            }

            // Clean up trigger if it has cleanup method
            if (this.trigger && typeof this.trigger.cleanup === 'function') {
                this.trigger.cleanup();
            }

            // Clear resources
            this.resources.clear();

            // Update global counters
            if (this.isActive) {
                globalJobCount--;
            }

            this.isActive = false;
            this.options.logger.debug('Job cleaned up:', this.id);

        } catch (err) {
            this.options.logger.error('Error cleaning up job:', {
                jobId: this.id,
                error: err.message
            });
        }
    }

    /**
     * Add a resource to track
     * @param {*} resource - Resource to track
     */
    addResource(resource) {
        if (resource) {
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
}

/**
 * Factory function to create Job instances
 * @param {*} trigger - Trigger configuration
 * @param {Function} jobFunc - Job function to execute
 * @param {*} jobData - Data to pass to job function
 * @param {Object} options - Additional options
 * @returns {Job} New Job instance
 */
function createJob(trigger, jobFunc, jobData, options = {}) {
    try {
        return new Job(trigger, jobFunc, jobData, options);
    } catch (err) {
        if (options.logger) {
            options.logger.error('Failed to create job:', err);
        }
        throw err;
    }
}

/**
 * Get global job statistics
 * @returns {Object} Global job statistics
 */
function getGlobalStats() {
    return {
        totalJobsCreated: globalJobIdCounter - 1,
        activeJobs: globalJobCount
    };
}

module.exports = {
    Job,
    createJob,
    getGlobalStats
};
