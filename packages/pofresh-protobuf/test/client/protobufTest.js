const protobuf = require('../../lib/client/protobuf');
const protobufServer = require('../../lib/protobuf');
const encoder = protobuf.encoder;
const decoder = protobuf.decoder;
const codec = protobuf.codec;
const parser = require('../../lib/parser');
const util = require('../../lib/util');
const should = require('should');
const tc = require('../testMsg');

describe('msgEncoderTest', function() {
  const protos = parser.parse(require('../example.json'));

  protobuf.init({ encoderProtos: protos, decoderProtos: protos });
  protobufServer.init({ encoderProtos: protos, decoderProtos: protos });

  describe('protobufTest', function() {
    for (const route in tc) {
      const msg = tc[route];
      const buffer = protobuf.encode(route, msg);

      const decodeMsg = protobuf.decode(route, buffer);

      util.equal(msg, decodeMsg).should.equal(true);
    }
  });
});

function toBuffer(arr) {
  const buffer = Buffer.alloc(arr.length);

  for (let i = 0; i < arr.length; i++) {
    buffer.writeUInt8(arr[i], i);
  }

  return buffer;
}
