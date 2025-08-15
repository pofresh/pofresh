/**
 * The main class and interface of the schedule module
 * Modern scheduler with enhanced error handling and resource management
 */
const PriorityQueue = require('./priorityQueue');
const Job = require('./job.js');
// Mock logger for testing - in production this would use pofresh-logger
const logger = {
    debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || ''),
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};
const ErrorHandler = require('./util/errorHandler');
const Constants = require('./util/constants');

class Scheduler {
    constructor(options = {}) {
        this.options = {
            accuracy: options.accuracy || Constants.DEFAULT_SETTINGS.ACCURACY,
            warnLimit: options.warnLimit || Constants.DEFAULT_SETTINGS.WARN_LIMIT,
            ...options
        };

        // Job storage and queue
        this.jobMap = new Map();
        this.queue = PriorityQueue.createPriorityQueue(this.comparator.bind(this));
        
        // State management
        this.currentTimer = null;
        this.isRunning = false;
        this.jobIdCounter = 1;
        this.jobCount = 0;
        
        // Resource management
        this.resourceManager = ErrorHandler.createResourceManager();
        
        // Statistics
        this.stats = {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            lateExecutions: 0
        };

        // Setup error handling
        this.setupErrorHandling();
    }

    /**
     * Schedule a new Job
     * @param {*} trigger - Trigger configuration (cron string or simple trigger object)
     * @param {Function} jobFunc - Job function to execute
     * @param {*} jobData - Data to pass to job function
     * @returns {number} Job ID
     */
    scheduleJob(trigger, jobFunc, jobData) {
        try {
            // Input validation
            ErrorHandler.validateInput(trigger, 'object|string', 'Trigger');
            ErrorHandler.validateInput(jobFunc, 'function', 'Job function');

            // Check job count limit
            ErrorHandler.validateInput(this.jobCount, 'number', 'Job count');
            if (this.jobCount >= Constants.DEFAULT_SETTINGS.MAX_JOB_COUNT) {
                throw new Error(Constants.ERROR_MESSAGES.TOO_MANY_JOBS);
            }

            // Create job
            const job = Job.createJob(trigger, jobFunc, jobData, {
                warnLimit: this.options.warnLimit,
                logger
            });

            const executeTime = job.executeTime();
            const id = job.id;

            // Store job
            this.jobMap.set(id, job);
            this.resourceManager.addJob(job);
            this.jobCount++;

            // Add to queue
            const element = { id, time: executeTime };
            const curJob = this.queue.peek();

            if (!curJob || executeTime < curJob.time) {
                this.queue.offer(element);
                this.setTimer(job);
            } else {
                this.queue.offer(element);
            }

            // Update statistics
            this.stats.totalJobs++;

            logger.debug('Job scheduled:', { id, executeTime, trigger });
            return id;

        } catch (err) {
            logger.error('Failed to schedule job:', err);
            throw err;
        }
    }

    /**
     * Cancel a scheduled job
     * @param {number} id - Job ID to cancel
     * @returns {boolean} True if job was found and cancelled
     */
    cancelJob(id) {
        try {
            ErrorHandler.validateInput(id, 'number', 'Job ID');

            const job = this.jobMap.get(id);
            if (!job) {
                logger.warn('Job not found for cancellation:', id);
                return false;
            }

            const curJob = this.queue.peek();
            if (curJob && id === curJob.id) {
                // Job is at the front of the queue
                this.queue.pop();
                this.jobMap.delete(id);
                this.jobCount--;
                
                // Clear current timer and reschedule
                if (this.currentTimer) {
                    clearTimeout(this.currentTimer);
                    this.currentTimer = null;
                }
                this.executeJob();
            } else {
                // Job is elsewhere in the queue or not in queue
                this.jobMap.delete(id);
                this.jobCount--;
            }

            // Clean up job resources
            if (job.cleanup) {
                job.cleanup();
            }

            logger.debug('Job cancelled:', id);
            return true;

        } catch (err) {
            logger.error('Failed to cancel job:', err);
            return false;
        }
    }

    /**
     * Clear last timeout and schedule the next job
     * @param {Job} job - Job to schedule
     */
    setTimer(job) {
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }

        const delay = job.executeTime() - Date.now();
        if (delay <= 0) {
            // Job should run immediately
            this.executeJob();
            return;
        }

        this.currentTimer = setTimeout(() => {
            this.executeJob();
        }, delay);

        this.resourceManager.addTimer(this.currentTimer);
    }

    /**
     * Execute due jobs and schedule next run
     */
    executeJob() {
        try {
            let job = this.peekNextJob();

            while (job && job.executeTime() - Date.now() < this.options.accuracy) {
                try {
                    job.run();
                    this.stats.completedJobs++;
                } catch (err) {
                    logger.error('Job execution failed:', { jobId: job.id, error: err });
                    this.stats.failedJobs++;
                }

                this.queue.pop();

                const nextTime = job.nextTime();
                if (nextTime) {
                    this.queue.offer({ id: job.id, time: nextTime });
                } else {
                    // Job has completed all executions
                    this.jobMap.delete(job.id);
                    this.jobCount--;
                }

                job = this.peekNextJob();
            }

            // Schedule next execution if there are jobs remaining
            if (job) {
                this.setTimer(job);
            } else {
                this.currentTimer = null;
            }

        } catch (err) {
            logger.error('Error in job execution loop:', err);
        }
    }

    /**
     * Return the next valid job without removing it
     * @returns {Job|null} Next valid job or null if none
     */
    peekNextJob() {
        if (this.queue.size() <= 0) {
            return null;
        }

        let job = null;
        do {
            const queueElement = this.queue.peek();
            if (!queueElement) {
                break;
            }

            job = this.jobMap.get(queueElement.id);
            if (!job) {
                // Job was cancelled but still in queue
                this.queue.pop();
            }
        } while (!job && this.queue.size() > 0);

        return job;
    }

    /**
     * Comparator for priority queue
     * @param {Object} e1 - First element
     * @param {Object} e2 - Second element
     * @returns {boolean} True if e1 should come after e2
     */
    comparator(e1, e2) {
        return e1.time > e2.time;
    }

    /**
     * Get scheduler statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            currentJobs: this.jobCount,
            queueSize: this.queue.size(),
            isRunning: this.isRunning
        };
    }

    /**
     * List all scheduled jobs
     * @returns {Array} Array of job information
     */
    listJobs() {
        const jobs = [];
        for (const [id, job] of this.jobMap) {
            jobs.push({
                id,
                executeTime: job.executeTime(),
                nextTime: job.nextTime(),
                runCount: job.runTime || 0,
                type: job.type
            });
        }
        return jobs;
    }

    /**
     * Shutdown the scheduler gracefully
     */
    shutdown() {
        try {
            logger.info('Shutting down scheduler...');
            
            // Clear current timer
            if (this.currentTimer) {
                clearTimeout(this.currentTimer);
                this.currentTimer = null;
            }

            // Clean up all resources
            this.resourceManager.cleanup();

            // Clear job map
            this.jobMap.clear();
            this.jobCount = 0;

            logger.info('Scheduler shutdown completed');
        } catch (err) {
            logger.error('Error during scheduler shutdown:', err);
        }
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection in Scheduler:', reason);
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception in Scheduler:', err);
        });
    }
}

// Create global scheduler instance for backward compatibility
const globalScheduler = new Scheduler();

// Legacy API for backward compatibility
function scheduleJob(trigger, jobFunc, jobData) {
    return globalScheduler.scheduleJob(trigger, jobFunc, jobData);
}

function cancelJob(id) {
    return globalScheduler.cancelJob(id);
}

module.exports = {
    Scheduler,
    scheduleJob,
    cancelJob,
    // Export the global instance for direct access
    default: globalScheduler
};
