const async = require('async');
const utils = require('../../util/utils');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);
const transactionLogger = require('pofresh-logger').getLogger('transaction-log', __filename);
const transactionErrorLogger = require('pofresh-logger').getLogger('transaction-error-log', __filename);

const manager = module.exports;

manager.transaction = (name, conditions, handlers, retry) => {
    let retryCount = retry;
    if (!retryCount) {
        retryCount = 1;
    }
    if (typeof name !== 'string') {
        logger.error('transaction name is error format, name: %s.', name);
        return;
    }
    if (typeof conditions !== 'object' || typeof handlers !== 'object') {
        logger.error(
            'transaction conditions parameter is error format, conditions: %j, handlers: %j.',
            conditions,
            handlers
        );
        return;
    }

    const cmethods = [],
        dmethods = [],
        cnames = [],
        dnames = [];
    for (const key in conditions) {
        if (!Object.hasOwn(conditions, key)) {
            continue;
        }

        if (typeof key !== 'string' || typeof conditions[key] !== 'function') {
            logger.error(
                'transaction conditions parameter is error format, condition name: %s, condition function: %j.',
                key,
                conditions[key]
            );
            return;
        }
        cnames.push(key);
        cmethods.push(conditions[key]);
    }

    let i = 0;
    // execute conditions
    async.forEachSeries(
        cmethods,
        (method, cb) => {
            method(cb);
            transactionLogger.info('[%s]:[%s] condition is executed.', name, cnames[i]);
            i++;
        },
        conditionErr => {
            if (conditionErr) {
                process.nextTick(() => {
                    transactionLogger.error(
                        '[%s]:[%s] condition is executed with err: %j.',
                        name,
                        cnames[--i],
                        conditionErr.stack
                    );
                    const log = {
                        name,
                        method: cnames[i],
                        time: Date.now(),
                        type: 'condition',
                        description: conditionErr.stack
                    };
                    transactionErrorLogger.error(JSON.stringify(log));
                });
                return;
            }
            // execute handlers
            process.nextTick(() => {
                for (const key in handlers) {
                    if (!Object.hasOwn(handlers, key)) {
                        continue;
                    }
                    if (typeof key !== 'string' || typeof handlers[key] !== 'function') {
                        logger.error(
                            'transcation handlers parameter is error format, handler name: %s, handler function: %j.',
                            key,
                            handlers[key]
                        );
                        return;
                    }
                    dnames.push(key);
                    dmethods.push(handlers[key]);
                }

                let flag = true;
                const times = retryCount;

                // do retry if failed util retry times
                async.whilst(
                    () => retryCount > 0 && flag,
                    callback => {
                        let j = 0;
                        retryCount--;
                        async.forEachSeries(
                            dmethods,
                            (method, cb) => {
                                method(cb);
                                transactionLogger.info('[%s]:[%s] handler is executed.', name, dnames[j]);
                                j++;
                            },
                            err => {
                                if (err) {
                                    process.nextTick(() => {
                                        transactionLogger.error(
                                            '[%s]:[%s]:[%s] handler is executed with err: %j.',
                                            name,
                                            dnames[--j],
                                            times - retryCount,
                                            err.stack
                                        );
                                        const log = {
                                            name,
                                            method: dnames[j],
                                            retry: times - retryCount,
                                            time: Date.now(),
                                            type: 'handler',
                                            description: err.stack
                                        };
                                        transactionErrorLogger.error(JSON.stringify(log));
                                        utils.invokeCallback(callback);
                                    });
                                    return;
                                }
                                flag = false;
                                utils.invokeCallback(callback);
                                process.nextTick(() => {
                                    transactionLogger.info(
                                        '[%s] all conditions and handlers are executed successfully.',
                                        name
                                    );
                                });
                            }
                        );
                    },
                    handlerErr => {
                        if (handlerErr) {
                            logger.error('transaction process is executed with error: %j', handlerErr);
                        }
                        // callback will not pass error
                    }
                );
            });
        }
    );
};
