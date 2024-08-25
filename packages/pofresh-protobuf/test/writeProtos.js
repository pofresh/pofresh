const protobuf = require('../lib/protobuf');
const fs = require('fs');

const protoFile = "./rootMsg.json";
const protoTarget = "./rootProtos.json";
const msgFile = "./rootMsgTC";
const msgTarget = "./rootMsg.json";

const protos = protobuf.parse(require(protoFile));

console.log(protos);
fs.writeFile(protoTarget, JSON.stringify(protos, null, 2), function () {

});

fs.writeFile(msgTarget, JSON.stringify(require(msgFile), null, 2), function () {

});