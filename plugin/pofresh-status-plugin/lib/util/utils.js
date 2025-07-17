const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = function(cb) {
  if (!!cb && typeof cb === 'function') {
    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

utils.size = function(obj) {
  let count = 0;
  for (const i in obj) {
    if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
      count++;
    }
  }
  return count;
};
