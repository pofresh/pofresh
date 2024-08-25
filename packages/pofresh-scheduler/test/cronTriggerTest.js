const cronTrigger = require('../lib/cronTrigger').createTrigger;

const SECOND = 0;
const MIN = 1;
const HOUR = 2;
const DOM = 3;
const MONTH = 4;
const DOW = 5;

function decoderTest() {
    let result = [];

    result.push(cronTrigger.decodeTrigger('12    2 3,4,5 4 5 1'));

    result.push(cronTrigger.decodeTrigger('*    1-3,2-9,4 3,4,5 4-9 5 1'));

    result.push(cronTrigger.decodeTrigger('12    2 3 4 5 1'));
    console.log(result);
}

function nextTimeTest(count) {
    let timer = new cronTrigger().decodeTrigger('0 0 0 1 0 2-5');

    let value = Date.now();
    console.log(timer);

    // console.log([1,2] instanceof Array);
    let r1, r2;
    let start = Date.now();
    for (let i = 0; i < count; i++)
        r1 = cronTrigger.nextTime(value, timer);
    let end = Date.now();

    console.log("first run time : " + (end - start));

    start = Date.now();
    for (let i = 0; i < count; i++)
        r2 = nextExcuteTimeTest(value, timer);
    end = Date.now();

    console.log("second run time : " + (end - start));

    console.log("first run time:" + r1);
    console.log("second run time:" + r2);
}

function nextExcuteTimeTest(time, cronTrigger) {
    let next = new Date(time + 1000);

    while (true) {
        if (!timeMatch(next.getMonth(), cronTrigger[MONTH])) {
            next.setMonth(next.getMonth() + 1);
            next.setDate(1);
            next.setHours(0);
            next.setMinutes(0);
            next.setSeconds(0);
            continue;
        }
        if (!timeMatch(next.getDate(), cronTrigger[DOM])) {
            next.setDate(next.getDate() + 1);
            next.setHours(0);
            next.setMinutes(0);
            next.setSeconds(0);
            continue;
        }
        if (!timeMatch(next.getDay(), cronTrigger[DOW])) {
            next.setDate(next.getDate() + 1);
            next.setHours(0);
            next.setMinutes(0);
            next.setSeconds(0);
            continue;
        }
        if (!timeMatch(next.getHours(), cronTrigger[HOUR])) {
            next.setHours(next.getHours() + 1);
            next.setMinutes(0);
            next.setSeconds(0);
            continue;
        }
        if (!timeMatch(next.getMinutes(), cronTrigger[MIN])) {
            next.setMinutes(next.getMinutes() + 1);
            next.setSeconds(0);
            continue;
        }
        if (!timeMatch(next.getSeconds(), cronTrigger[SECOND])) {
            next.setSeconds(next.getSeconds() + 1);
            continue;
        }

        break;
    }

    return next;
}

function getDomLimitTest(y1, y2, m1, m2) {
    for (let year = y1; year <= y2; year++)
        for (let month = m1; month <= m2; month++) {
            console.log(year + "." + (month + 1) + " limit : " + cronTrigger.getDomLimit(year, month));
        }
}

function timeMatch(value, cronTime) {
//  console.log("match value " + value + ' cronTime ' + cronTime); 
    if (typeof (cronTime) == 'number') {
        if (cronTime == -1)
            return true;
        if (value == cronTime)
            return true;
        return false;
    } else if (typeof (cronTime) == 'object' && cronTime instanceof Array) {
        if (value < cronTime[0] || value > cronTime[cronTime.length - 1])
            return false;

        for (let i = 0; i < cronTime.length; i++)
            if (value == cronTime[i])
                return true;

        return false;
    }

    return null;
}

function test() {
    nextTimeTest(100);
    // getDomLimitTest(1800,2002,1,1);
}

test();