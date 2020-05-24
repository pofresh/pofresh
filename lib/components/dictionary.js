const fs = require('fs');
const path = require('path');
const utils = require('../util/utils');
const Loader = require('pofresh-loader');
const pathUtil = require('../util/pathUtil');
const crypto = require('crypto');

module.exports = function (app, opts) {
    return new Component(app, opts);
};

class Component {
    constructor(app, opts) {
        this.name = '__dictionary__';

        this.app = app;
        this.dict = {};
        this.abbrs = {};
        this.userDicPath = null;
        this.version = "";

        //Set user dictionary
        let p = path.join(app.getBase(), '/config/dictionary.json');
        if (!!opts && !!opts.dict) {
            p = opts.dict;
        }
        if (fs.existsSync(p)) {
            this.userDicPath = p;
        }
    }

    start(cb) {
        let servers = this.app.get('servers');
        let routes = [];

        //Load all the handler files
        for (let serverType in servers) {
            let p = pathUtil.getHandlerPath(this.app.getBase(), serverType);
            if (!p) {
                continue;
            }

            let handlers = Loader.load(p, this.app);

            for (let name in handlers) {
                let handler = handlers[name];
                for (let key in handler) {
                    if (typeof (handler[key]) === 'function') {
                        routes.push(serverType + '.' + name + '.' + key);
                    }
                }
            }
        }

        //Sort the route to make sure all the routers abbr are the same in all the servers
        routes.sort();
        let abbr;
        let i;
        for (i = 0; i < routes.length; i++) {
            abbr = i + 1;
            this.abbrs[abbr] = routes[i];
            this.dict[routes[i]] = abbr;
        }

        //Load user dictionary
        if (!!this.userDicPath) {
            let userDic = require(this.userDicPath);

            abbr = routes.length + 1;
            for (i = 0; i < userDic.length; i++) {
                let route = userDic[i];

                this.abbrs[abbr] = route;
                this.dict[route] = abbr;
                abbr++;
            }
        }

        this.version = crypto.createHash('md5').update(JSON.stringify(this.dict)).digest('base64');

        utils.invokeCallback(cb);
    }

    getDict() {
        return this.dict;
    }

    getAbbrs() {
        return this.abbrs;
    }

    getVersion() {
        return this.version;
    }

}