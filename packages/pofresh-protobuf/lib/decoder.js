const codec = require('./codec');
const util = require('./util');

const Decoder = module.exports;

let buffer;
let offset = 0;

Decoder.init = function (protos) {
    this.protos = protos || {};
};

Decoder.setProtos = function (protos) {
    if (protos) {
        this.protos = protos;
    }
};

Decoder.decode = function (route, buf) {
    const protos = this.protos[route];

    buffer = buf;
    offset = 0;
    if (protos) {
        return decodeMsg({}, protos, buffer.length);
    }

    return null;
};

function decodeMsg(msg, protos, length) {
    while (offset < length) {
        const head = getHead();
        const type = head.type;
        const tag = head.tag;
        const name = protos.__tags[tag];
        switch (protos[name].option) {
        case 'optional':
        case 'required':
            msg[name] = decodeProp(protos[name].type, protos);
            break;
        case 'repeated':
            if (!msg[name]) {
                msg[name] = [];
            }
            decodeArray(msg[name], protos[name].type, protos);
            break;
        }
    }

    return msg;
}

/**
 * Test if the given msg is finished
 */
function isFinish(msg, protos) {
    return !protos.__tags[peekHead().tag];
}

/**
 * Get property head from protobuf
 */
function getHead() {
    const tag = codec.decodeUInt32(getBytes());
    return {
        type: tag & 0x7,
        tag: tag >> 3
    };
}

/**
 * Get tag head without move the offset
 */
function peekHead() {
    const tag = codec.decodeUInt32(peekBytes());

    return {
        type: tag & 0x7,
        tag: tag >> 3
    };
}

function decodeProp(type, protos) {
    switch (type) {
    case 'uInt32':
        return codec.decodeUInt32(getBytes());
    case 'int32':
    case 'sInt32':
        return codec.decodeSInt32(getBytes());
    case 'float':
        const float = buffer.readFloatLE(offset);
        offset += 4;
        return float;
    case 'double':
        const double = buffer.readDoubleLE(offset);
        offset += 8;
        return double;
    case 'string':
        const length = codec.decodeUInt32(getBytes());

        const str = buffer.toString('utf8', offset, offset + length);
        offset += length;

        return str;
    default:
        const message = protos && (protos.__messages[type] || Decoder.protos['message ' + type]);
        if (message) {
            const length = codec.decodeUInt32(getBytes());
            const msg = {};
            decodeMsg(msg, message, offset + length);
            return msg;
        }
        break;
    }
}

function decodeArray(array, type, protos) {
    if (util.isSimpleType(type)) {
        const length = codec.decodeUInt32(getBytes());

        for (let i = 0; i < length; i++) {
            array.push(decodeProp(type));
        }
    } else {
        array.push(decodeProp(type, protos));
    }
}

function getBytes(flag) {
    const bytes = [];
    let pos = offset;
    flag = flag || false;

    let b;
    do {
        b = buffer.readUInt8(pos);
        bytes.push(b);
        pos++;
    } while (b >= 128);

    if (!flag) {
        offset = pos;
    }
    return bytes;
}

function peekBytes() {
    return getBytes(true);
}
