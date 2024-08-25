/**
 * This is the trigger used to decode the cronTimer and calculate the next execution time of the cron Trigger.
 */
const logger = require('log4js').getLogger(__filename);
const decoder = require('./cronTriggerDecoder');

const SECOND = 0;
const MIN = 1;
const HOUR = 2;
const DOM = 3;
const MONTH = 4;
const DOW = 5;

/**
 * The constructor of the CronTrigger
 * @param trigger The trigger str used to build the cronTrigger instance
 */
class CronTrigger {
    constructor(trigger, job) {
        this.trigger = decoder.decodeCronTime(trigger);
        this.nextTime = this.nextExecuteTime(Date.now());
        this.job = job;
    }

    /**
     * Get the current executeTime of trigger
     */
    executeTime() {
        return this.nextTime;
    }

    /**
     * Calculate the next valid cronTime after the given time
     * @param time given time point
     * @return number|null nearest valid time after the given time point
     */
    nextExecuteTime(time) {
        //add 1s to the time, so it must be the next time
        time = time ? time : this.nextTime;
        time += 1000;

        const cronTrigger = this.trigger;
        const date = new Date(time);
        date.setMilliseconds(0);

        outmost: while (true) {
            if (date.getFullYear() > 2999) {
                logger.error("Can't compute the next time, exceed the limit");
                return null;
            }
            if (!decoder.timeMatch(date.getMonth(), cronTrigger[MONTH])) {
                let nextMonth = decoder.nextCronTime(date.getMonth(), cronTrigger[MONTH]);

                if (nextMonth == null)
                    return null;

                if (nextMonth <= date.getMonth()) {
                    date.setYear(date.getFullYear() + 1);
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

            if (!decoder.timeMatch(date.getDate(), cronTrigger[DOM]) || !decoder.timeMatch(date.getDay(), cronTrigger[DOW])) {
                let domLimit = decoder.getDomLimit(date.getFullYear(), date.getMonth());

                do {
                    let nextDom = decoder.nextCronTime(date.getDate(), cronTrigger[DOM]);
                    if (nextDom == null)
                        return null;

                    //If the date is in the next month, add month
                    if (nextDom <= date.getDate() || nextDom > domLimit) {
                        date.setDate(1);
                        date.setMonth(date.getMonth() + 1);
                        date.setHours(0);
                        date.setMinutes(0);
                        date.setSeconds(0);
                        continue outmost;
                    }

                    date.setDate(nextDom);
                } while (!decoder.timeMatch(date.getDay(), cronTrigger[DOW]));

                date.setHours(0);
                date.setMinutes(0);
                date.setSeconds(0);
            }

            if (!decoder.timeMatch(date.getHours(), cronTrigger[HOUR])) {
                let nextHour = decoder.nextCronTime(date.getHours(), cronTrigger[HOUR]);

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

            if (!decoder.timeMatch(date.getMinutes(), cronTrigger[MIN])) {
                let nextMinute = decoder.nextCronTime(date.getMinutes(), cronTrigger[MIN]);

                if (nextMinute <= date.getMinutes()) {
                    date.setHours(date.getHours() + 1);
                    date.setMinutes(nextMinute);
                    date.setSeconds(0);
                    continue;
                }

                date.setMinutes(nextMinute);
                date.setSeconds(0);
            }

            if (!decoder.timeMatch(date.getSeconds(), cronTrigger[SECOND])) {
                let nextSecond = decoder.nextCronTime(date.getSeconds(), cronTrigger[SECOND]);

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
        return this.nextTime;
    }

}

/**
 * Create cronTrigger
 * @param trigger The Cron Trigger string
 * @param job
 * @return CronTrigger Cron trigger
 */
function createTrigger(trigger, job) {
    return new CronTrigger(trigger, job);
}

module.exports.createTrigger = createTrigger;