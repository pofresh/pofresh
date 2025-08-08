const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = cb => {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};
