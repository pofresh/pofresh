const should = require('should');
const encoder = require('../../lib/client/protobuf').codec;

describe('client encoder test', function() {
  describe('float test for 10000 times', function() {
    for (let i = 0; i < 10000; i++) {
      const float = Math.random();

      const bytes = encoder.encodeFloat(float);
      const result = encoder.decodeFloat(bytes, 0);

      const diff = Math.abs(float - result);
      //console.log('float : %j, result : %j, diff : %j', float, result, diff);
      diff.should.below(0.0000001);
    }
  });

  describe('double test for 10000 times', function() {
    for (let i = 0; i < 10000; i++) {
      const double = Math.random();

      const bytes = encoder.encodeDouble(double);
      const result = encoder.decodeDouble(bytes, 0);

      double.should.equal(result);
    }
  });

  describe('utf8 encode & decode test, use 1000 * 1000 test case', function() {
    const num = 1000;
    const limit = 1000;
    for (let i = 0; i < num; i++) {
      const strLength = Math.ceil(Math.random() * limit);
      const arr = [];
      for (let j = 0; j < strLength; j++) {
        arr.push(Math.floor(Math.random() * 65536));
      }
      //arr = [ 58452, 127, 38641, 25796, 20652, 19237 ];

      const str = String.fromCharCode.apply(null, arr);

      //console.log('old arr : %j', arr);

      const length = encoder.byteLength(str);
      const buffer = new ArrayBuffer(length);
      const bytes = new Uint8Array(buffer);

      const offset = encoder.encodeStr(bytes, 0, str);
      //console.log('encode over, offset : %j, length : %j, str length : %j', offset, length, str.length);
      //console.log(bytes);
      length.should.equal.offset;

      const result = encoder.decodeStr(bytes, 0, length);

      str.length.should.equal(result.length);
      let flag = true;
      for (let m = 0; m < str.length; m++) {
        if (str.charCodeAt(m) != result.charCodeAt(m)) {
          console.log(
            'error ! origin : %j, result : %j, code : %j, code 1 : %j',
            str,
            result,
            str.charCodeAt(m),
            result.charCodeAt(m)
          );
          console.log(arr);
          flag = false;
        }
      }

      if (!flag) return;
      //console.log('str : %j, bytes : %j, result : %j', str, bytes, result);
    }
  });

  describe('string decode speed test', function() {
    const array = [];
    const length = 100000;
    for (let i = 0; i < length; i++, array.push(0));
    let start = Date.now();
    let str = '';
    for (let j = 0; j < length; ) {
      str += String.fromCharCode.apply(null, array.slice(j, j + 10000));
      j += 10000;
    }
    //let str = String.fromCharCode.apply(null, array);
    let end = Date.now();

    console.log('cost time with fromCharCode method : %j, length : %j', end - start, str.length);

    start = Date.now();
    str = '';
    for (let i = 0; i < length; i++) {
      str += array[i];
    }
    end = Date.now();

    console.log('cost time by add string: %j, length : %j', end - start, str.length);
  });
});
