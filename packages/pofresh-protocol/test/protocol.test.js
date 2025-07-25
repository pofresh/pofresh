const ProtocolTest = require('../');
const Package = ProtocolTest.Package;
const Message = ProtocolTest.Message;

describe('Pofresh protocol test', function () {
    describe('String encode and decode', function () {
        it('should be ok to encode and decode Chinese string', function () {
            const str = '你好, abc~~~';
            const buf = ProtocolTest.strencode(str);
            expect(buf).toBeDefined();
            expect(ProtocolTest.strdecode(buf)).toEqual(str);
        });
    });

    describe('Package encode and decode', function () {
        it('should keep the same data after encoding and decoding', function () {
            const msg = 'hello world~';
            const buf = Package.encode(Package.TYPE_DATA, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Package.decode(buf);
            expect(res).toBeDefined();
            expect(res.type).toEqual(Package.TYPE_DATA);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should ok when encoding and decoding package without body', function () {
            const buf = Package.encode(Package.TYPE_HANDSHAKE);
            expect(buf).toBeDefined();
            const res = Package.decode(buf);
            expect(res).toBeDefined();
            expect(res.type).toEqual(Package.TYPE_HANDSHAKE);
            expect(res.body).toBeNull();
        });
    });

    describe('Message encode and decode', function () {
        it('should be ok for encoding and decoding request', function () {
            const id = 128;
            const compress = 0;
            const route = 'connector.entryHandler.entry';
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_REQUEST);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding empty route', function () {
            const id = 256;
            const compress = 0;
            const route = '';
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_REQUEST);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding null route', function () {
            const n = Math.floor(10000 * Math.random());
            const id = 128 * n;
            const compress = 0;
            const route = null;
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_REQUEST);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual('');
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding compress route', function () {
            const id = 256;
            const compress = 1;
            const route = 3;
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();

            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_REQUEST);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding mutil-bytes id', function () {
            const id = Math.pow(2, 30);
            const compress = 1;
            const route = 3;
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_REQUEST, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_REQUEST);
            expect(res.compressRoute).toEqual(compress);

            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding notify', function () {
            const compress = 0;
            const route = 'connector.entryHandler.entry';
            const msg = 'hello world~';
            const buf = Message.encode(0, Message.TYPE_NOTIFY, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(0);
            expect(res.type).toEqual(Message.TYPE_NOTIFY);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding response', function () {
            const id = 1;
            const compress = 0;
            const msg = 'hello world~';
            const buf = Message.encode(id, Message.TYPE_RESPONSE, compress, null, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(id);
            expect(res.type).toEqual(Message.TYPE_RESPONSE);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toBeNull();
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });

        it('should be ok for encoding and decoding push', function () {
            const compress = 0;
            const route = 'connector.entryHandler.entry';
            const msg = 'hello world~';
            const buf = Message.encode(0, Message.TYPE_PUSH, compress, route, ProtocolTest.strencode(msg));
            expect(buf).toBeDefined();
            const res = Message.decode(buf);
            expect(res).toBeDefined();
            expect(res.id).toEqual(0);
            expect(res.type).toEqual(Message.TYPE_PUSH);
            expect(res.compressRoute).toEqual(compress);
            expect(res.route).toEqual(route);
            expect(res.body).toBeDefined();
            expect(ProtocolTest.strdecode(res.body)).toEqual(msg);
        });
    });
});
