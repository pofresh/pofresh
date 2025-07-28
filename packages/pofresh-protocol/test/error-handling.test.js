/**
 * Test error handling and edge cases
 */

const Protocol = require('../index');
const Package = Protocol.Package;
const Message = Protocol.Message;
const { strencode, strdecode } = Protocol;
const bufferUtils = require('../lib/buffer-utils');
const { getAllocBuffer, getFromBuffer, copyArray } = bufferUtils;
describe('Error Handling Tests', () => {
    describe('String Codec Error Handling', () => {
        it('should throw error for non-string input in strencode', () => {
            expect(() => strencode(123)).toThrow('Expected string input');
            expect(() => strencode(null)).toThrow('Expected string input');
            expect(() => strencode(undefined)).toThrow('Expected string input');
        });

        it('should handle empty string correctly', () => {
            const encoded = strencode('');
            expect(encoded.length).toBe(0);
            const decoded = strdecode(encoded);
            expect(decoded).toBe('');
        });

        it('should handle empty buffer in strdecode', () => {
            expect(strdecode(null)).toBe('');
            expect(strdecode(undefined)).toBe('');
            expect(strdecode(new Uint8Array(0))).toBe('');
        });

        it('should handle Unicode characters correctly', () => {
            const testStrings = [
                '你好世界', // Chinese
                '🚀🌟💫', // Emojis
                'Ñoël', // Accented characters
                '\u{1F600}\u{1F601}' // Unicode escapes
            ];
            
            testStrings.forEach(str => {
                const encoded = strencode(str);
                const decoded = strdecode(encoded);
                expect(decoded).toBe(str);
            });
        });
    });

    describe('Buffer Utils Error Handling', () => {
        it('should throw error for invalid length in getAllocBuffer', () => {
            expect(() => getAllocBuffer(-1)).toThrow('Length must be a non-negative integer');
            expect(() => getAllocBuffer(1.5)).toThrow('Length must be a non-negative integer');
            expect(() => getAllocBuffer('10')).toThrow('Length must be a non-negative integer');
            expect(() => getAllocBuffer(0x80000000)).toThrow('Length exceeds maximum buffer size');
        });

        it('should throw error for null data in getFromBuffer', () => {
            expect(() => getFromBuffer(null)).toThrow('Data cannot be null or undefined');
            expect(() => getFromBuffer(undefined)).toThrow('Data cannot be null or undefined');
        });

        it('should handle various data types in getFromBuffer', () => {
            expect(() => getFromBuffer([1, 2, 3])).not.toThrow();
            expect(() => getFromBuffer(new ArrayBuffer(10))).not.toThrow();
            expect(() => getFromBuffer('hello')).not.toThrow();
        });

        it('should throw error for invalid parameters in copyArray', () => {
            const dest = new Uint8Array(10);
            const src = new Uint8Array(5);
            
            expect(() => copyArray(null, 0, src, 0, 5)).toThrow('Destination and source buffers are required');
            expect(() => copyArray(dest, 0, null, 0, 5)).toThrow('Destination and source buffers are required');
            expect(() => copyArray(dest, -1, src, 0, 5)).toThrow('Offsets and length must be non-negative');
            expect(() => copyArray(dest, 0, src, -1, 5)).toThrow('Offsets and length must be non-negative');
            expect(() => copyArray(dest, 0, src, 0, -1)).toThrow('Offsets and length must be non-negative');
            expect(() => copyArray(dest, 8, src, 0, 5)).toThrow('Destination buffer overflow');
            expect(() => copyArray(dest, 0, src, 3, 5)).toThrow('Source buffer overflow');
        });
    });

    describe('Package Error Handling', () => {
        it('should throw error for invalid package type', () => {
            expect(() => Package.encode(0, null)).toThrow('Invalid package type');
            expect(() => Package.encode(6, null)).toThrow('Invalid package type');
            expect(() => Package.encode('1', null)).toThrow('Package type must be an integer');
            expect(() => Package.encode(1.5, null)).toThrow('Package type must be an integer');
        });

        it('should throw error for oversized package body', () => {
            const largeBody = new Uint8Array(0x1000000); // 16MB > 24-bit max
            expect(() => Package.encode(Package.TYPE_DATA, largeBody)).toThrow('Package body too large');
        });

        it('should throw error for invalid buffer in decode', () => {
            expect(() => Package.decode(null)).toThrow('Buffer is required for decoding');
            expect(() => Package.decode(new Uint8Array(0))).toThrow('Empty buffer cannot be decoded');
        });

        it('should throw error for incomplete package', () => {
            const incompleteHeader = new Uint8Array([1, 0, 0]); // Missing 1 byte
            expect(() => Package.decode(incompleteHeader)).toThrow('Incomplete package header');
            
            const incompleteBody = new Uint8Array([1, 0, 0, 5]); // Says 5 bytes but no body
            expect(() => Package.decode(incompleteBody)).toThrow('Incomplete package body');
        });

        it('should throw error for invalid package type in decode', () => {
            const invalidType = new Uint8Array([0, 0, 0, 0]); // Type 0 is invalid
            expect(() => Package.decode(invalidType)).toThrow('Invalid package type');
        });
    });

    describe('Message Error Handling', () => {
        it('should throw error for invalid message type', () => {
            expect(() => Message.encode(1, -1, 0, null, null)).toThrow('Invalid message type');
            expect(() => Message.encode(1, 4, 0, null, null)).toThrow('Invalid message type');
            expect(() => Message.encode(1, '0', 0, null, null)).toThrow('Message type must be an integer');
        });

        it('should throw error for invalid message ID', () => {
            expect(() => Message.encode(-1, Message.TYPE_REQUEST, 0, null, null)).toThrow('Message ID must be a non-negative integer');
            expect(() => Message.encode('1', Message.TYPE_REQUEST, 0, null, null)).toThrow('Message ID must be a non-negative integer');
            expect(() => Message.encode(0x80000000, Message.TYPE_REQUEST, 0, null, null)).toThrow('Message ID too large');
        });

        it('should throw error for invalid compressed route', () => {
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 1, -1, null)).toThrow('Compressed route must be a non-negative integer');
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 1, 'route', null)).toThrow('Compressed route must be a non-negative integer');
        });

        it('should throw error for invalid uncompressed route', () => {
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 0, 123, null)).toThrow('Uncompressed route must be a string');
        });

        it('should throw error for oversized route', () => {
            const longRoute = 'a'.repeat(300); // > 255 bytes
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 0, longRoute, null)).toThrow('Route too long');
        });

        it('should throw error for oversized message body', () => {
            const largeBody = new Uint8Array(0x80000000); // > max safe integer
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 0, 'route', largeBody)).toThrow('Message body too large');
        });

        it('should throw error for invalid buffer in decode', () => {
            expect(() => Message.decode(null)).toThrow('Buffer is required for decoding');
            expect(() => Message.decode(new Uint8Array(0))).toThrow('Empty buffer cannot be decoded');
        });

        it('should throw error for incomplete message', () => {
            const emptyBuffer = new Uint8Array(0);
            expect(() => Message.decode(emptyBuffer)).toThrow('Empty buffer cannot be decoded');
            
            const incompleteFlag = new Uint8Array(0);
            expect(() => Message.decode(incompleteFlag)).toThrow('Empty buffer cannot be decoded');
        });

        it('should throw error for invalid message type in decode', () => {
            const invalidType = new Uint8Array([8]); // Type 4 is invalid (shifted left by 1 = 8)
            expect(() => Message.decode(invalidType)).toThrow('Invalid message type');
        });

        it('should handle truncated message ID', () => {
            // Create a message with incomplete ID (continuation bit set but no next byte)
            const truncatedId = new Uint8Array([0, 0x80]); // Flag + incomplete ID
            expect(() => Message.decode(truncatedId)).toThrow('Incomplete message: truncated message ID');
        });

        it('should handle truncated route', () => {
            // Create a message with incomplete route
            const truncatedRoute = new Uint8Array([2, 5]); // Flag for notify + route length 5 but no route data
            expect(() => Message.decode(truncatedRoute)).toThrow('Incomplete message: truncated route');
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero-length operations correctly', () => {
            // Zero-length copy should not throw
            const dest = new Uint8Array(5);
            const src = new Uint8Array(5);
            expect(() => copyArray(dest, 0, src, 0, 0)).not.toThrow();
            
            // Zero-length buffer allocation
            const zeroBuffer = getAllocBuffer(0);
            expect(zeroBuffer.length).toBe(0);
        });

        it('should handle maximum valid values', () => {
            // Maximum package body size (24-bit)
            const maxBodySize = 0xFFFFFF;
            expect(() => Package.encode(Package.TYPE_DATA, new Uint8Array(maxBodySize))).not.toThrow();
            
            // Maximum message ID
            const maxId = 0x7FFFFFFF;
            expect(() => Message.encode(maxId, Message.TYPE_REQUEST, 0, 'route', null)).not.toThrow();
            
            // Maximum route length
            const maxRoute = 'a'.repeat(255);
            expect(() => Message.encode(1, Message.TYPE_REQUEST, 0, maxRoute, null)).not.toThrow();
        });

        it('should handle boundary conditions in message ID encoding', () => {
            const testIds = [0, 1, 127, 128, 16383, 16384, 2097151, 2097152];
            
            testIds.forEach(id => {
                const encoded = Message.encode(id, Message.TYPE_REQUEST, 0, 'test', null);
                const decoded = Message.decode(encoded);
                expect(decoded.id).toBe(id);
            });
        });
    });
});