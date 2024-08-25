const logger = require('../index');

const config = {
    "appenders": {
        "console": {
            "type": "console"
        },
    },
    "categories": {
        "default": {
            "appenders": ["console"],
            "level": "all"
        }
    },
    "replaceConsole": true,
    "rawMessage": false,
    "lineDebug": false
};

logger.configure(config);


const log = logger.getLogger('log', __filename, process.pid);
// process.env.LOGGER_LINE = true;
// process.env.RAW_MESSAGE = true; //only message
log.info('test1');
log.debug('test2');
log.warn('test3');
log.error('test4');