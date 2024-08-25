const schedule = require('../lib/schedule');
const cronTrigger = require('../lib/cronTrigger');
const jobMap = [];

const simpleJob = function (data) {
    let t = data.id + data.period;
    console.log("run for simple job :" + data.id + " period: " + data.period + " at time " + (new Date()));
}

const cronJob = function (data) {
    console.log("run for cronJob :" + data.id + " at time " + (new Date()));
}

function scheduleSimpleJobTest(count) {
    let id = 0;
    for (let i = 0; i < count; i++) {
        let time = Math.ceil(Math.random() * 10 * 1000);
        let period = Math.ceil(Math.random() * 60 * 1000 + 100)
        id = schedule.scheduleJob({start: Date.now() + time, period: period}, simpleJob, {
            id: id++,
            period: period
        });
        jobMap.push(id);
    }
}

function scheduleCronJobTest(count) {
    let id = 0;
//  let trigger = cronTrigger.decodeTrigger('* * 2-20 * * *');
    for (let i = 0; i < count; i++) {
        let second = Math.floor(Math.random() * 10);
        id = schedule.scheduleJob('0/2,2-10,13-20,40-45,55-56 * * * * *', cronJob, {id: id++});
        jobMap.push(id);
    }
}

function cancleJob(data) {
    let jobMap = data.jobMap;
    if (jobMap.length > 0) {
        let id = jobMap.pop();
        console.log("Cancel job : " + id + " Last jobs count : " + jobMap.length);
        data.schedule.cancelJob(id);
    } else
        console.log("All job has been cancled");
}

function scheduleCancleJobTest() {
    let id = schedule.scheduleJob({start: Date.now(), period: 100, count: jobMap.length}, cancleJob, {
        jobMap: jobMap,
        schedule: schedule
    });
}

function test() {
    scheduleSimpleJobTest(5);

    scheduleCronJobTest(5);

//  scheduleCancleJobTest();
}

test();
//schedule.scheduleJob({period:30, count:4}, simpleJob, {name:'simpleJob'});