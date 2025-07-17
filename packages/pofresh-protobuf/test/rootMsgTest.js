const should = require('should');
const protobuf = require('../lib/protobuf');
const util = require('../lib/util');
const tc = require('./rootMsgTC');

describe('msgEncoderTest', function() {
  const protos = protobuf.parse(require('./example.json'));
  protobuf.init({ encoderProtos: protos, decoderProtos: protos });

  it('encodeTest', function(done) {
    // console.log('%j', tc);

    for (const route in tc) {
      const msg = tc[route];
      console.log('msg=>', route, msg);
      const buffer = protobuf.encode(route, msg);
      console.log('buffer', route, buffer);
      const decodeMsg = protobuf.decode(route, buffer);
      util.equal(msg, decodeMsg).should.equal(true);
    }
    done();
  });
});
