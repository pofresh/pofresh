let protobuf = require('../../lib/client/protobuf');
let protobufServer = require('../../lib/protobuf');
let encoder = protobuf.encoder;
let decoder = protobuf.decoder;
let codec = protobuf.codec;
let parser = require('../../lib/parser');
let util = require('../../lib/util');
let should = require('should');
let tc = require('../testMsg');

describe('msgEncoderTest', function () {

    let protos = parser.parse(require('../example.json'));

    protobuf.init({encoderProtos: protos, decoderProtos: protos});
    protobufServer.init({encoderProtos: protos, decoderProtos: protos});

    describe('protobufTest', function () {
        for (let route in tc) {
            let msg = tc[route];
            let buffer = protobuf.encode(route, msg);

            let decodeMsg = protobuf.decode(route, buffer);

            util.equal(msg, decodeMsg).should.equal(true);
        }
    });
});

function toBuffer(arr) {
    let buffer = Buffer.alloc(arr.length);

    for (let i = 0; i < arr.length; i++) {
        buffer.writeUInt8(arr[i], i);
    }

    return buffer;
}