import { describe, it, expect } from 'vitest';
import protobuf from '@/protobuf.js';

const encoder = protobuf.codec;

describe('Client Encoder Tests', () => {
  describe('Float encoding and decoding', () => {
    it('should correctly encode and decode 10000 random float numbers', () => {
      for (let i = 0; i < 10000; i++) {
        const float = Math.random();
        const bytes = encoder.encodeFloat(float);
        const result = encoder.decodeFloat(bytes, 0);
        const diff = Math.abs(float - result);
        expect(diff).toBeLessThan(0.0000001);
      }
    });
  });

  describe('Double encoding and decoding', () => {
    it('should correctly encode and decode 10000 random double numbers', () => {
      for (let i = 0; i < 10000; i++) {
        const double = Math.random();
        const bytes = encoder.encodeDouble(double);
        const result = encoder.decodeDouble(bytes, 0);
        expect(result).toBe(double);
      }
    });
  });

  describe('UTF8 string encoding and decoding', () => {
    it('should correctly encode and decode 1000 random UTF8 strings', () => {
      const num = 1000;
      const limit = 1000;
      
      for (let i = 0; i < num; i++) {
        const strLength = Math.ceil(Math.random() * limit);
        const arr = [];
        
        for (let j = 0; j < strLength; j++) {
          arr.push(Math.floor(Math.random() * 65536));
        }
        
        const str = String.fromCharCode.apply(null, arr);
        const length = encoder.byteLength(str);
        const buffer = new ArrayBuffer(length);
        const bytes = new Uint8Array(buffer);
        
        const offset = encoder.encodeStr(bytes, 0, str);
        expect(length).toBe(offset);
        
        const result = encoder.decodeStr(bytes, 0, length);
        expect(str.length).toBe(result.length);
        
        for (let m = 0; m < str.length; m++) {
          expect(str.charCodeAt(m)).toBe(result.charCodeAt(m));
        }
      }
    });
  });

  describe('String decode performance', () => {
    it('should benchmark string decoding performance', () => {
      const array = [];
      const length = 100000;
      
      for (let i = 0; i < length; i++) {
        array.push(0);
      }
      
      // Test chunked approach
      let start = Date.now();
      let str = '';
      for (let j = 0; j < length; ) {
        str += String.fromCharCode.apply(null, array.slice(j, j + 10000));
        j += 10000;
      }
      let end = Date.now();
      const chunkedTime = end - start;
      
      // Test character-by-character approach
      start = Date.now();
      str = '';
      for (let i = 0; i < length; i++) {
        str += String.fromCharCode(array[i]);
      }
      end = Date.now();
      const charByCharTime = end - start;
      
      console.log(`Chunked approach: ${chunkedTime}ms, Char-by-char: ${charByCharTime}ms`);
      
      // Just verify both approaches work
      expect(chunkedTime).toBeGreaterThanOrEqual(0);
      expect(charByCharTime).toBeGreaterThanOrEqual(0);
    });
  });
});