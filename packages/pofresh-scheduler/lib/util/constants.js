/**
 * Constants for pofresh-scheduler
 */

// Job types
const JOB_TYPES = {
    SIMPLE: 1,
    CRON: 2
};

// Default scheduler settings
const DEFAULT_SETTINGS = {
    ACCURACY: 10, // milliseconds
    WARN_LIMIT: 500, // milliseconds
    MAX_JOB_ID: Number.MAX_SAFE_INTEGER,
    MAX_JOB_COUNT: 10000,
    MAX_FUTURE_TIME: 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
};

// Error messages
const ERROR_MESSAGES = {
    INVALID_TRIGGER: 'Invalid trigger configuration',
    INVALID_JOB_FUNCTION: 'Job function must be a valid function',
    INVALID_CRON_EXPRESSION: 'Invalid cron expression',
    INVALID_JOB_ID: 'Invalid job ID',
    JOB_NOT_FOUND: 'Job not found',
    SCHEDULER_NOT_RUNNING: 'Scheduler is not running',
    DUPLICATE_JOB_ID: 'Duplicate job ID',
    TOO_MANY_JOBS: 'Too many jobs scheduled'
};

// Trigger validation rules
const TRIGGER_RULES = {
    SIMPLE: {
        REQUIRED: ['start'],
        OPTIONAL: ['period', 'count', 'delay'],
        TYPES: {
            start: 'number',
            period: 'number',
            count: 'number',
            delay: 'number'
        }
    },
    CRON: {
        PATTERN: /^(\*|\d+)(\/(\d+))?(\s+(\*|\d+)(\/(\d+))?){5}$/
    }
};

module.exports = {
    JOB_TYPES,
    DEFAULT_SETTINGS,
    ERROR_MESSAGES,
    TRIGGER_RULES
};
