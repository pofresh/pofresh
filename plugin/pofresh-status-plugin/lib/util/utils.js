const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = cb => {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
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
