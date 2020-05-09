  let Emitter = require('emitter');
  window.EventEmitter = Emitter;

  let protocol = require('pofresh-protocol');
  window.Protocol = protocol;
  
  let protobuf = require('pofresh-protobuf');
  window.protobuf = protobuf;
  
  let pofresh = require('pofresh-jsclient-websocket');
  window.pofresh = pofresh;
