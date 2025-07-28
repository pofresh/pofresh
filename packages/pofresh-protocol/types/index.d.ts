/**
 * TypeScript definitions for pofresh-protocol
 */

export interface PackageDecodeResult {
  type: number;
  body: Buffer | null;
}

export interface MessageDecodeResult {
  id: number;
  type: number;
  compressRoute: number;
  route: string | number | null;
  body: Buffer;
}

export declare class Package {
  static readonly TYPE_HANDSHAKE: 1;
  static readonly TYPE_HANDSHAKE_ACK: 2;
  static readonly TYPE_HEARTBEAT: 3;
  static readonly TYPE_DATA: 4;
  static readonly TYPE_KICK: 5;

  /**
   * Encode package
   * @param type Package type
   * @param body Package body (optional)
   * @returns Encoded buffer
   */
  static encode(type: number, body?: Buffer): Buffer;

  /**
   * Decode package
   * @param buffer Encoded package data
   * @returns Decoded package
   */
  static decode(buffer: Buffer): PackageDecodeResult;
}

export declare class Message {
  static readonly TYPE_REQUEST: 0;
  static readonly TYPE_NOTIFY: 1;
  static readonly TYPE_RESPONSE: 2;
  static readonly TYPE_PUSH: 3;

  /**
   * Encode message
   * @param id Message ID
   * @param type Message type
   * @param compressRoute Route compression flag (0 or 1)
   * @param route Message route
   * @param body Message body
   * @returns Encoded buffer
   */
  static encode(
    id: number,
    type: number,
    compressRoute: number,
    route: string | number | null,
    body: Buffer
  ): Buffer;

  /**
   * Decode message
   * @param buffer Encoded message data
   * @returns Decoded message
   */
  static decode(buffer: Buffer): MessageDecodeResult;
}

export interface Constants {
  PKG_HEAD_BYTES: number;
  MSG_FLAG_BYTES: number;
  MSG_ROUTE_CODE_BYTES: number;
  MSG_ID_MAX_BYTES: number;
  MSG_ROUTE_LEN_BYTES: number;
  MSG_ROUTE_CODE_MAX: number;
  MSG_COMPRESS_ROUTE_MASK: number;
  MSG_COMPRESS_GZIP_MASK: number;
  MSG_COMPRESS_GZIP_ENCODE_MASK: number;
  MSG_TYPE_MASK: number;
}

export interface BufferUtils {
  /**
   * Write unsigned integer to buffer
   */
  writeUInt32(buffer: Buffer, value: number, offset: number): number;
  
  /**
   * Read unsigned integer from buffer
   */
  readUInt32(buffer: Buffer, offset: number): { value: number; offset: number };
}

export interface MessageUtils {
  /**
   * Check if message has ID
   */
  msgHasId(type: number): boolean;
  
  /**
   * Check if message has route
   */
  msgHasRoute(type: number): boolean;
  
  /**
   * Calculate message ID bytes
   */
  caculateMsgIdBytes(id: number): number;
  
  /**
   * Encode message flags
   */
  encodeMsgFlag(type: number, compressRoute: number, buffer: Buffer, offset: number): number;
  
  /**
   * Encode message ID
   */
  encodeMsgId(id: number, buffer: Buffer, offset: number): number;
  
  /**
   * Encode message route
   */
  encodeMsgRoute(compressRoute: number, route: string | number, buffer: Buffer, offset: number): number;
  
  /**
   * Encode message body
   */
  encodeMsgBody(msg: Buffer, buffer: Buffer, offset: number): number;
}

/**
 * Encode string to buffer
 * @param str String to encode
 * @returns Encoded buffer
 */
export declare function strencode(str: string): Buffer;

/**
 * Decode buffer to string
 * @param buffer Buffer to decode
 * @returns Decoded string
 */
export declare function strdecode(buffer: Buffer): string;

export declare class Protocol {
  static readonly Package: typeof Package;
  static readonly Message: typeof Message;
  
  // Constants
  static readonly PKG_HEAD_BYTES: number;
  static readonly MSG_FLAG_BYTES: number;
  static readonly MSG_ROUTE_CODE_BYTES: number;
  static readonly MSG_ID_MAX_BYTES: number;
  static readonly MSG_ROUTE_LEN_BYTES: number;
  static readonly MSG_ROUTE_CODE_MAX: number;
  static readonly MSG_COMPRESS_ROUTE_MASK: number;
  static readonly MSG_COMPRESS_GZIP_MASK: number;
  static readonly MSG_COMPRESS_GZIP_ENCODE_MASK: number;
  static readonly MSG_TYPE_MASK: number;

  /**
   * Encode string to buffer
   * @param str String to encode
   * @returns Encoded buffer
   */
  static strencode(str: string): Buffer;

  /**
   * Decode buffer to string
   * @param buffer Buffer to decode
   * @returns Decoded string
   */
  static strdecode(buffer: Buffer): string;
}

// Named exports
export { Package, Message, Protocol };
export { constants, bufferUtils, messageUtils } from './lib';

// Default export
export default Protocol;

// CommonJS compatibility
export = Protocol;