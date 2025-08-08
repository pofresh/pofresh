exports.composeRequest = (id, moduleId, body) => {
    if (id) {
        // request message
        return JSON.stringify({ reqId: id, moduleId, body });
    }
    // notify message
    return { moduleId, body };
};

exports.composeResponse = (req, err, res) => {
    if (req.reqId) {
        // request only
        return JSON.stringify({
            respId: req.reqId,
            error: cloneError(err),
            body: res
        });
    }
    // invalid message(notify dose not need response)
    return null;
};

exports.composeCommand = (id, command, moduleId, body) => {
    if (id !== null) {
        // command message
        return JSON.stringify({ reqId: id, command, moduleId, body });
    }
    return JSON.stringify({ command, moduleId, body });
};

exports.parse = msg => {
    if (typeof msg === 'string') {
        return JSON.parse(msg);
    }
    return msg;
};

exports.isRequest = msg => msg?.reqId;

const cloneError = origin => {
    // copy the stack infos for Error instance json result is empty
    if (!(origin instanceof Error)) {
        return origin;
    }
    return {
        message: origin.message,
        stack: origin.stack
    };
};

exports.PRO_OK = 1;
exports.PRO_FAIL = -1;
