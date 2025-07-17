const should = require('should');
const Protocol = require('../');
const Package = Protocol.Package;
const Message = Protocol.Message;

describe('Pofresh protocol test', function() {
  describe('String encode and decode', function() {
    it('should be ok to encode and decode Chinese string', function() {
      const str = '你好, abc~~~';
      const buf = Protocol.strencode(str);
      should.exist(buf);
      str.should.equal(Protocol.strdecode(buf));
    });
  });

  describe('Package encode and decode', function() {
    it('should keep the same data after encoding and decoding', function() {
      const msg = 'hello world~';
      const buf = Package.encode(Package.TYPE_DATA, Protocol.strencode(msg));
      should.exist(buf);
      const res = Package.decode(buf);
      should.exist(res);
      Package.TYPE_DATA.should.equal(res.type);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should ok when encoding and decoding package without body', function() {
      const buf = Package.encode(Package.TYPE_HANDSHAKE);
      should.exist(buf);
      const res = Package.decode(buf);
      should.exist(res);
      Package.TYPE_HANDSHAKE.should.equal(res.type);
      should.not.exist(res.body);
    });
  });

  describe('Message encode and decode', function() {
    it('should be ok for encoding and decoding request', function() {
      const id = 128;
      const compress = 0;
      const route = 'connector.entryHandler.entry';
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding empty route', function() {
      const id = 256;
      const compress = 0;
      const route = '';
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding null route', function() {
      const n = Math.floor(10000 * Math.random());
      const id = 128 * n;
      const compress = 0;
      const route = null;
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      res.route.should.equal('');
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding compress route', function() {
      const id = 256;
      const compress = 1;
      const route = 3;
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);

      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding mutil-bytes id', function() {
      const id = Math.pow(2, 30);
      const compress = 1;
      const route = 3;
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_REQUEST.should.equal(res.type);
      compress.should.equal(res.compressRoute);

      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding notify', function() {
      const compress = 0;
      const route = 'connector.entryHandler.entry';
      const msg = 'hello world~';
      const buf = Message.encode(0, Message.TYPE_NOTIFY, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      res.id.should.equal(0);
      Message.TYPE_NOTIFY.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding response', function() {
      const id = 1;
      const compress = 0;
      const msg = 'hello world~';
      const buf = Message.encode(id, Message.TYPE_RESPONSE, compress, null, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      id.should.equal(res.id);
      Message.TYPE_RESPONSE.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      should.not.exist(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });

    it('should be ok for encoding and decoding push', function() {
      const compress = 0;
      const route = 'connector.entryHandler.entry';
      const msg = 'hello world~';
      const buf = Message.encode(0, Message.TYPE_PUSH, compress, route, Protocol.strencode(msg));
      should.exist(buf);
      const res = Message.decode(buf);
      should.exist(res);
      res.id.should.equal(0);
      Message.TYPE_PUSH.should.equal(res.type);
      compress.should.equal(res.compressRoute);
      route.should.equal(res.route);
      should.exist(res.body);
      msg.should.equal(Protocol.strdecode(res.body));
    });
  });
});
