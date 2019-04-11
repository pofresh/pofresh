  var Emitter = require('emitter');
  window.EventEmitter = Emitter;

  var protocol = require('pofresh-protocol');
  window.Protocol = protocol;
  
  var protobuf = require('pofresh-protobuf');
  window.protobuf = protobuf;
  
  var pofresh = require('pofresh-jsclient-websocket');
  window.pofresh = pofresh;
