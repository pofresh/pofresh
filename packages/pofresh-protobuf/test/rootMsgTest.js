const should = require('should');
const protobuf = require('../lib/protobuf');
const util = require('../lib/util');
const tc = require('./rootMsgTC');

describe('msgEncoderTest', function () {
    let protos = protobuf.parse(require('./example.json'));
    protobuf.init({encoderProtos: protos, decoderProtos: protos});

    it('encodeTest', function (done) {
        // console.log('%j', tc);

        for (let route in tc) {
            let msg = tc[route];
            console.log('msg=>', route, msg);
            let buffer = protobuf.encode(route, msg);
            console.log('buffer', route, buffer);
            let decodeMsg = protobuf.decode(route, buffer);
            util.equal(msg, decodeMsg).should.equal(true);
        }
        done();
    });
});