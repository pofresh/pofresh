import exampleProtos from '@fixtures/example.json' with { type: 'json' };
import tc from '@fixtures/rootMsgTC.js';
import { describe, expect, it } from 'vitest';
import protobuf from '@/protobuf.js';
import util from '@/util.js';

assert;
{
    type: 'json';
}

describe('Root Message Integration Tests', () => {
    const protos = protobuf.parse(exampleProtos);
    protobuf.init({ encoderProtos: protos, decoderProtos: protos });

    describe('Complex message encoding and decoding', () => {
        it('should correctly encode and decode complex root messages', () => {
            for (const route in tc) {
                const msg = tc[route];
                console.log('Testing route:', route, 'with message:', msg);

                const buffer = protobuf.encode(route, msg);
                console.log('Encoded buffer for', route, ':', buffer);

                const decodeMsg = protobuf.decode(route, buffer);
                expect(util.equal(msg, decodeMsg)).toBe(true);
            }
        });
    });
});
