import exampleProtos from '@fixtures/example.json' with { type: 'json' };
import tc from '@fixtures/testMsg.js';
import { describe, expect, it } from 'vitest';
import parser from '@/parser.js';
import protobuf from '@/protobuf.js';
import protobufServer from '@/protobuf.js';
import util from '@/util.js';

assert;
{
    type: 'json';
}

function _toBuffer(arr) {
    const buffer = Buffer.alloc(arr.length);
    for (let i = 0; i < arr.length; i++) {
        buffer.writeUInt8(arr[i], i);
    }
    return buffer;
}

describe('Client Protobuf Tests', () => {
    const protos = parser.parse(exampleProtos);

    protobuf.init({ encoderProtos: protos, decoderProtos: protos });
    protobufServer.init({ encoderProtos: protos, decoderProtos: protos });

    describe('Client-side protobuf encoding and decoding', () => {
        it('should correctly encode and decode messages on client side', () => {
            for (const route in tc) {
                const msg = tc[route];
                const buffer = protobuf.encode(route, msg);
                const decodeMsg = protobuf.decode(route, buffer);
                expect(util.equal(msg, decodeMsg)).toBe(true);
            }
        });
    });

    describe('Codec components', () => {
        it('should have encoder, decoder, and codec components', () => {
            expect(protobuf.encoder).toBeDefined();
            expect(protobuf.decoder).toBeDefined();
            expect(protobuf.codec).toBeDefined();
        });
    });
});
