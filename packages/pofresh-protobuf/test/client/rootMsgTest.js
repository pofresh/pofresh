const protobuf = require('../../lib/client/protobuf');
const encoder = protobuf.encoder;
const decoder = protobuf.decoder;
const codec = protobuf.codec;
const parser = require('../../lib/parser');
const util = require('../../lib/util');
const should = require('should');
const tc = require('../rootMsgTC');

describe('msgEncoderTest', function() {
  const protos = parser.parse(require('../rootMsg.json'));

  protobuf.init({ encoderProtos: protos, decoderProtos: protos });

  describe('protobufTest', function() {
    for (const route in tc) {
      const msg = tc[route];

      console.log('====================');
      console.log(route);

      const buffer = protobuf.encode(route, msg);

      console.log(msg);
      console.log(buffer.length);

      const decodeMsg = protobuf.decode(route, buffer);

      console.log(decodeMsg);
      console.log('====================');

      util.equal(msg, decodeMsg).should.equal(true);
    }
  });
});
