import { describe, it, expect } from 'vitest';
import protobuf from '@/protobuf.js';
import util from '@/util.js';
import tc from '@fixtures/testMsg.js';
import exampleProtos from '@fixtures/example.json' assert { type: 'json' };

describe('Protobuf Integration Tests', () => {
  const protos = protobuf.parse(exampleProtos);
  protobuf.init({ encoderProtos: protos, decoderProtos: protos });

  describe('Message encoding and decoding', () => {
    it('should correctly encode and decode all test messages', () => {
      for (const route in tc) {
        const msg = tc[route];
        const buffer = protobuf.encode(route, msg);
        const decodeMsg = protobuf.decode(route, buffer);
        expect(util.equal(msg, decodeMsg)).toBe(true);
      }
    });
  });
});