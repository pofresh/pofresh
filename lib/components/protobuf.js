const fs = require('fs');
const path = require('path');
const protobuf = require('pofresh-protobuf');
const Constants = require('../util/constants');
const crypto = require('crypto');
const logger = require('pofresh-logger').getLogger('pofresh', __filename);

module.exports = function (app, opts) {
    return new Component(app, opts);
};

class Component {
    constructor(app, opts) {
        this.name = '__protobuf__';

        this.app = app;
        opts = opts || {};
        this.watchers = {};
        this.serverProtos = {};
        this.clientProtos = {};
        this.version = "";

        let env = app.get(Constants.RESERVED.ENV);
        let originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
        let presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
        let originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
        let presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

        this.serverProtosPath = opts.serverProtos || (fs.existsSync(originServerPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
        this.clientProtosPath = opts.clientProtos || (fs.existsSync(originClientPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

        this.setProtos(Constants.RESERVED.SERVER, path.join(app.getBase(), this.serverProtosPath));
        this.setProtos(Constants.RESERVED.CLIENT, path.join(app.getBase(), this.clientProtosPath));

        protobuf.init({encoderProtos: this.serverProtos, decoderProtos: this.clientProtos});
    }

    encode(key, msg) {
        return protobuf.encode(key, msg);
    }

    encode2Bytes(key, msg) {
        return protobuf.encode2Bytes(key, msg);
    }

    decode(key, msg) {
        return protobuf.decode(key, msg);
    }

    getProtos() {
        return {
            server: this.serverProtos,
            client: this.clientProtos,
            version: this.version
        };
    }

    getVersion() {
        return this.version;
    }

    setProtos(type, path) {
        if (!fs.existsSync(path)) {
            return;
        }

        if (type === Constants.RESERVED.SERVER) {
            this.serverProtos = protobuf.parse(require(path));
        }

        if (type === Constants.RESERVED.CLIENT) {
            this.clientProtos = protobuf.parse(require(path));
        }

        let protoStr = JSON.stringify(this.clientProtos) + JSON.stringify(this.serverProtos);
        this.version = crypto.createHash('md5').update(protoStr).digest('base64');

        //Watch file
        let watcher = fs.watch(path, this.onUpdate.bind(this, type, path));
        if (this.watchers[type]) {
            this.watchers[type].close();
        }
        this.watchers[type] = watcher;
    }

    onUpdate(type, path, event) {
        if (event !== 'change') {
            return;
        }

        let self = this;
        fs.readFile(path, 'utf8', function (err, data) {
            try {
                let protos = protobuf.parse(JSON.parse(data));
                if (type === Constants.RESERVED.SERVER) {
                    protobuf.setEncoderProtos(protos);
                    self.serverProtos = protos;
                } else {
                    protobuf.setDecoderProtos(protos);
                    self.clientProtos = protos;
                }

                let protoStr = JSON.stringify(self.clientProtos) + JSON.stringify(self.serverProtos);
                self.version = crypto.createHash('md5').update(protoStr).digest('base64');
                logger.info('change proto file , type : %j, path : %j, version : %j', type, path, self.version);
            } catch (e) {
                logger.warn("change proto file error! path : %j", path);
                logger.warn(e);
            }
        });
    }

    stop(force, cb) {
        for (let type in this.watchers) {
            this.watchers[type].close();
        }
        this.watchers = {};
        process.nextTick(cb);
    }

}




