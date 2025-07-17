const Emitter = require('emitter');
window.EventEmitter = Emitter;

const protocol = require('pofresh-protocol');
window.Protocol = protocol;

const protobuf = require('pofresh-protobuf');
window.protobuf = protobuf;

const pofresh = require('pofresh-jsclient-websocket');
window.pofresh = pofresh;
