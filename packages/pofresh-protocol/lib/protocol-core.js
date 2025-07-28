/**
 * Core Protocol class that combines all modules
 */

const Package = require('./package');
const Message = require('./message');
const { strencode, strdecode } = require('./string-codec');
const constants = require('./constants');

class Protocol {
    static Package = Package;
    static Message = Message;

    /**
     * Encode string to buffer
     * @param  {String} str string to encode
     * @return {Buffer|Uint8Array} encoded buffer
     */
    static strencode(str) {
        return strencode(str);
    }

    /**
     * Decode buffer to string
     * @param  {Buffer|Uint8Array} buffer string data
     * @return {String} decoded string
     */
    static strdecode(buffer) {
        return strdecode(buffer);
    }
}

// Export constants as static properties
Object.assign(Protocol, constants);

module.exports = Protocol;
