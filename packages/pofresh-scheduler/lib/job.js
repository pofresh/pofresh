/**
 * This is the class of the job used in schedule module
 */
const CronTrigger = require('./cronTrigger');
const SimpleTrigger = require('./simpleTrigger');

const SIMPLE_JOB = 1;
const CRON_JOB = 2;

let jobId = 1;
let jobCount = 0;

const warnLimit = 500;

const logger = require('log4js').getLogger(__filename);


//For test
let lateCount = 0;

class Job {
    constructor(trigger, jobFunc, jobData) {
        this.data = (!!jobData) ? jobData : null;
        this.func = jobFunc;

        if (typeof (trigger) == 'string') {
            this.type = CRON_JOB;
            this.trigger = CronTrigger.createTrigger(trigger, this);
        } else if (typeof (trigger) == 'object') {
            this.type = SIMPLE_JOB;
            this.trigger = SimpleTrigger.createTrigger(trigger, this);
        }

        this.id = jobId++;
        this.runTime = 0;
    }

    /**
     * Run the job code
     */
    run() {
        try {
            jobCount++;
            this.runTime++;
            let late = Date.now() - this.executeTime();
            if (late > warnLimit)
                logger.warn('run Job count ' + jobCount + ' late :' + late + ' lateCount ' + (++lateCount));
            this.func(this.data);
        } catch (e) {
            logger.error("Job run error for exception ! " + e.stack);
        }
    }

    /**
     * Compute the next excution time
     */
    nextTime() {
        return this.trigger.nextExecuteTime();
    }

    executeTime() {
        return this.trigger.executeTime();
    }

}

/**
 * The Interface to create Job
 * @param trigger The trigger to use
 * @param jobFunc The function the job to run
 * @param jobDate The date the job use
 * @return Job new instance of the give job or null if fail
 */
function createJob(trigger, jobFunc, jobDate) {
    return new Job(trigger, jobFunc, jobDate);
}

module.exports.createJob = createJob;