const util = module.exports;

util.isSimpleType = function(type) {
  return (
    type === 'uInt32' ||
        type === 'sInt32' ||
        type === 'int32' ||
        type === 'uInt64' ||
        type === 'sInt64' ||
        type === 'float' ||
        type === 'double'
  );
};

util.equal = function(obj0, obj1) {
  for (const key in obj0) {
    const m = obj0[key];
    const n = obj1[key];

    if (typeof m === 'object') {
      if (!util.equal(m, n)) {
        return false;
      }
    } else if (m !== n) {
      return false;
    }
  }

  return true;
};
