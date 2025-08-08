import { describe, expect, it } from 'vitest';
import encoder from '@/codec.js';

describe('Codec Tests', () => {
    describe('UInt32 and UInt64 encoding/decoding', () => {
        it('should correctly encode and decode 10000 random numbers', () => {
            const limit = 0xff_ff_ff_ff; // 32-bit unsigned integer max value
            const count = 10_000;

            for (let i = 0; i < count; i++) {
                const number = Math.ceil(Math.random() * limit);
                const result = encoder.decodeUInt32(encoder.encodeUInt32(number));
                expect(result).toBe(number);
            }
        });
    });

    describe('SInt32 and SInt64 encoding/decoding', () => {
        it('should correctly encode and decode 10000 random signed numbers', () => {
            const limit = 0x7f_ff_ff_ff; // 32-bit signed integer max value

            for (let i = 0; i < 10_000; i++) {
                const flag = Math.random() > 0.5 ? 1 : -1;
                const number = Math.ceil(Math.random() * limit) * flag;
                const result = encoder.decodeSInt32(encoder.encodeSInt32(number));
                expect(result).toBe(number);
            }
        });
    });
});
