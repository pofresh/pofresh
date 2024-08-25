const logger = require('log4js').getLogger(__filename);

const decoder = module.exports;
decoder.decodeCronTime = decodeCronTime;
decoder.nextCronTime = nextCronTime;
decoder.timeMatch = timeMatch;
decoder.getDomLimit = getDomLimit;

const Limit = [
    [0, 59],
    [0, 59],
    [0, 24],
    [1, 31],
    [0, 11],
    [0, 6]
];

/**
 * Decode the cronTrigger string to arrays
 * @param cronTimeStr The cronTimeStr need to decode, like "0 12 * * * 3"
 * @return Array array to represent the cronTimer
 */
function decodeCronTime(cronTimeStr) {
    cronTimeStr = cronTimeStr.trim();
    const cronTimes = cronTimeStr.split(/\s+/);

    if (cronTimes.length !== 6) {
        logger.error('param count error');
        return null;
    }

    for (let i = 0; i < cronTimes.length; i++) {
        cronTimes[i] = (decodeTimeStr(cronTimes[i], i));

        if (!checkNum(cronTimes[i], Limit[i][0], Limit[i][1])) {
            logger.error('Decode cronTime error, value exceed limit!' +
                JSON.stringify({
                    cronTime: cronTimes[i],
                    limit: Limit[i]
                }));
            return null;
        }
    }

    return cronTimes;
}

/**
 * Decode the cron Time string
 * @param timeStr The cron time string, like: 1,2 or 1-3
 * @param type
 * @return Array sorted array, like [1,2,3]
 */
function decodeTimeStr(timeStr, type) {
    let result = {};
    let arr = [];

    if (timeStr === '*') {
        return -1;
    } else if (timeStr.search(',') > 0) {
        let timeArr = timeStr.split(',');
        for (let i = 0; i < timeArr.length; i++) {
            let time = timeArr[i];
            if (time.match(/^\d+-\d+$/)) {
                decodeRangeTime(result, time);
            } else if (time.match(/^\d+\/\d+/)) {
                decodePeriodTime(result, time, type);
            } else if (!isNaN(time)) {
                let num = Number(time);
                result[num] = num;
            } else
                return null;
        }
    } else if (timeStr.match(/^\d+-\d+$/)) {
        decodeRangeTime(result, timeStr);
    } else if (timeStr.match(/^\d+\/\d+/)) {
        decodePeriodTime(result, timeStr, type);
    } else if (!isNaN(timeStr)) {
        let num = Number(timeStr);
        result[num] = num;
    } else {
        return null;
    }

    for (let key in result) {
        arr.push(result[key]);
    }

    arr.sort(function (a, b) {
        return a - b;
    });

    return arr;
}

/**
 * return the next match time of the given value
 * @param value The time value
 * @param cronTime The cronTime need to match
 * @return number|null match value or null if unmatched(it often means an error occur).
 */
function nextCronTime(value, cronTime) {
    value += 1;

    if (typeof (cronTime) == 'number') {
        if (cronTime === -1)
            return value;
        else
            return cronTime;
    } else if (typeof (cronTime) == 'object' && cronTime instanceof Array) {
        if (value <= cronTime[0] || value > cronTime[cronTime.length - 1])
            return cronTime[0];

        for (let i = 0; i < cronTime.length; i++)
            if (value <= cronTime[i])
                return cronTime[i];
    }

    logger.warn('Compute next Time error! value :' + value + ' cronTime : ' + cronTime);
    return null;
}

/**
 * Match the given value to the cronTime
 * @param value The given value
 * @param cronTime The cronTime
 * @return boolean match result
 */
function timeMatch(value, cronTime) {
    if (typeof (cronTime) == 'number') {
        return cronTime === -1 || value === cronTime;
    } else if (typeof (cronTime) == 'object' && cronTime instanceof Array) {
        if (value < cronTime[0] || value > cronTime[cronTime.length - 1])
            return false;

        for (let i = 0; i < cronTime.length; i++)
            if (value === cronTime[i])
                return true;
    }

    return false;
}

/**
 * Decode time range
 * @param map The decode map
 * @param timeStr The range string, like 2-5
 */
function decodeRangeTime(map, timeStr) {
    const times = timeStr.split('-');
    times[0] = Number(times[0]);
    times[1] = Number(times[1]);
    if (times[0] > times[1]) {
        console.log("Error time range");
        return null;
    }

    for (let i = times[0]; i <= times[1]; i++) {
        map[i] = i;
    }
}

/**
 * Compute the period timer
 */
function decodePeriodTime(map, timeStr, type) {
    let times = timeStr.split('/');
    let max = Limit[type][1];

    let remind = Number(times[0]);
    let period = Number(times[1]);

    if (period === 0)
        return;

    for (let i = remind; i <= max; i += period) {
        // if (i % period == remind)
        map[i] = i;
        // }
    }
}

/**
 * Get the date limit of given month
 * @param year given year
 * @param month given month
 * @return Number date count of given month
 */
function getDomLimit(year, month) {
    const date = new Date(year, month + 1, 0);
    return date.getDate();
}

/**
 * Check if the numbers are valid
 * @param nums The numbers array need to check
 * @param min Minimums value
 * @param max Maximum value
 * @return boolean all the numbers are in the data range
 */
function checkNum(nums, min, max) {
    if (nums == null)
        return false;

    if (nums === -1)
        return true;

    for (let i = 0; i < nums.length; i++) {
        if (nums[i] < min || nums[i] > max)
            return false;
    }

    return true;
}
