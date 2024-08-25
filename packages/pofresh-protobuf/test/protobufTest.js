const should = require('should');
const protobuf = require('../lib/protobuf');
const util = require('../lib/util');
const tc = require('./testMsg');

describe('msgEncoderTest', function () {
    let protos = protobuf.parse(require('./example.json'));
    protobuf.init({encoderProtos: protos, decoderProtos: protos});

    it('encodeTest', function (done) {
        for (let route in tc) {
            let msg = tc[route];
            let buffer = protobuf.encode(route, msg);
            let decodeMsg = protobuf.decode(route, buffer);
            util.equal(msg, decodeMsg).should.equal(true);
        }
        done();
    });
});