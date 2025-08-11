const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = (cb, ...args) => {
    if (cb && typeof cb === 'function') {
        cb.apply(null, args);
    }
};

utils.size = obj => {
    let count = 0;
    for (const i in obj) {
        if (Object.hasOwn(obj, i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
};
