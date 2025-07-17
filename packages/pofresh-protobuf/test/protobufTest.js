const should = require('should');
const protobuf = require('../lib/protobuf');
const util = require('../lib/util');
const tc = require('./testMsg');

describe('msgEncoderTest', function() {
  const protos = protobuf.parse(require('./example.json'));
  protobuf.init({ encoderProtos: protos, decoderProtos: protos });

  it('encodeTest', function(done) {
    for (const route in tc) {
      const msg = tc[route];
      const buffer = protobuf.encode(route, msg);
      const decodeMsg = protobuf.decode(route, buffer);
      util.equal(msg, decodeMsg).should.equal(true);
    }
    done();
  });
});
