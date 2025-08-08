import rootMsgProtos from '@fixtures/rootMsg.json' with { type: 'json' };
import tc from '@fixtures/rootMsgTC.js';
import { describe, expect, it } from 'vitest';
import parser from '@/parser.js';
import protobuf from '@/protobuf.js';
import util from '@/util.js';

assert;
{
    type: 'json';
}

describe('Client Root Message Tests', () => {
    const protos = parser.parse(rootMsgProtos);
    protobuf.init({ encoderProtos: protos, decoderProtos: protos });

    describe('Client-side root message encoding and decoding', () => {
        it('should correctly encode and decode complex root messages on client side', () => {
            for (const route in tc) {
                const msg = tc[route];
                const buffer = protobuf.encode(route, msg);
                const decodeMsg = protobuf.decode(route, buffer);
                expect(util.equal(msg, decodeMsg)).toBe(true);
            }
        });
    });

    describe('Client protobuf components', () => {
        it('should have all required components initialized', () => {
            expect(protobuf.encoder).toBeDefined();
            expect(protobuf.decoder).toBeDefined();
            expect(protobuf.codec).toBeDefined();
        });
    });
});
