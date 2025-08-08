const Package = require('./package');
const Message = require('./message');
const { strencode, strdecode } = require('./string-codec');
const constants = require('./constants');
const bufferUtils = require('./buffer-utils');
const messageUtils = require('./message-utils');
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
Object.assign(Protocol, constants);
module.exports = Protocol;
module.exports.Package = Package;
module.exports.Message = Message;
module.exports.strencode = strencode;
module.exports.strdecode = strdecode;
module.exports.constants = constants;
module.exports.bufferUtils = bufferUtils;
module.exports.messageUtils = messageUtils;
module.exports.default = Protocol;
//# sourceMappingURL=pofresh-protocol.cjs.js.map
