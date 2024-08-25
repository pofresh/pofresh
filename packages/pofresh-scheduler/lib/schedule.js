/**
 * The main class and interface of the schedule module
 */
const PriorityQueue = require('./priorityQueue');
const Job = require('./job.js');

const map = {};
const queue = PriorityQueue.createPriorityQueue(comparator);

let timer;

//The accuracy of the scheduler, it will affect the performance when the schedule tasks are
//crowded together
let accuracy = 10;

/**
 * Schedule a new Job
 */
function scheduleJob(trigger, jobFunc, jobData) {
    let job = Job.createJob(trigger, jobFunc, jobData);
    let executeTime = job.executeTime();
    let id = job.id;

    map[id] = job;
    let element = {
        id: id,
        time: executeTime
    };

    let curJob = queue.peek();
    if (!curJob || executeTime < curJob.time) {
        queue.offer(element);
        setTimer(job);

        return job.id;
    }

    queue.offer(element);
    return job.id;
}

/**
 * Cancel Job
 */
function cancelJob(id) {
    let curJob = queue.peek();
    if (curJob && id === curJob.id) { // to avoid queue.peek() is null
        queue.pop();
        delete map[id];

        clearTimeout(timer);
        executeJob();
    }
    delete map[id];
    return true;
}

/**
 * Clear last timeout and schedule the next job, it will automatically run the job that
 * need to run now
 * @param job The job need to schedule
 * @return void
 */
function setTimer(job) {
    clearTimeout(timer);

    timer = setTimeout(executeJob, job.executeTime() - Date.now());
}

/**
 * The function used to run the schedule job, and setTimeout for next running job
 */
function executeJob() {
    let job = peekNextJob();

    while (!!job && (job.executeTime() - Date.now()) < accuracy) {
        job.run();
        queue.pop();

        let nextTime = job.nextTime();

        if (nextTime === null) {
            delete map[job.id];
        } else {
            queue.offer({id: job.id, time: nextTime});
        }
        job = peekNextJob();
    }

    //If all the job have been canceled
    if (!job)
        return;

    //Run next schedule
    setTimer(job);
}

/**
 * Return, but not remove the next valid job
 * @return Next valid job
 */
function peekNextJob() {
    if (queue.size() <= 0)
        return null;

    let job = null;

    do {
        job = map[queue.peek().id];
        if (!job) queue.pop();
    } while (!job && queue.size() > 0);

    return (!!job) ? job : null;
}

function comparator(e1, e2) {
    return e1.time > e2.time;
}

module.exports.scheduleJob = scheduleJob;
module.exports.cancelJob = cancelJob;
