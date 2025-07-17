const encoder = require('../lib/codec');
const should = require('should');

describe('encoder test', function() {
  it('uInt32 and uInt64 test, for encode and decode 10000 random number', function(done) {
    const limit = 0x7fffffffffffffff;

    const count = 10000;
    for (let i = 0; i < count; i++) {
      const number = Math.ceil(Math.random() * limit);
      const result = encoder.decodeUInt32(encoder.encodeUInt32(number));
      should.equal(number, result);
    }
    done();
  });

  it('sInt32 adn sInt64 test, for encode and decode 10000 random number', function(done) {
    const limit = 0xfffffffffffff;

    for (let i = 0; i < 10000; i++) {
      const flag = Math.random > 0.5 ? 1 : -1;
      const number = Math.ceil(Math.random() * limit) * flag;

      const result = encoder.decodeSInt32(encoder.encodeSInt32(number));

      should.equal(number, result);
    }
    done();
  });
});
