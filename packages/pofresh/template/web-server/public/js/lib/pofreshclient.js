(function () {
    const isArray = Array.isArray;

    let root = this;

    function EventEmitter() {}

    if (typeof module !== 'undefined' && module.exports) {
        module.exports.EventEmitter = EventEmitter;
    } else {
        root = window;
        root.EventEmitter = EventEmitter;
    }

    // By default EventEmitters will print a warning if more than
    // 10 listeners are added to it. This is a useful default which
    // helps finding memory leaks.
    //
    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    const defaultMaxListeners = 10;
    EventEmitter.prototype.setMaxListeners = function (n) {
        if (!this._events) {
            this._events = {};
        }
        this._maxListeners = n;
    };

    EventEmitter.prototype.emit = function () {
        const type = arguments[0];
        // If there is no 'error' event listener then throw.
        if (type === 'error' && (!this._events?.error || (isArray(this._events.error) && !this._events.error.length))) {
            if (this.domain) {
                const er = arguments[1];
                er.domain_emitter = this;
                er.domain = this.domain;
                er.domain_thrown = false;
                this.domain.emit('error', er);
                return false;
            }

            if (arguments[1] instanceof Error) {
                throw arguments[1]; // Unhandled 'error' event
            }
            throw new Error("Uncaught, unspecified 'error' event.");
            return false;
        }

        if (!this._events) {
            return false;
        }
        const handler = this._events[type];
        if (!handler) {
            return false;
        }

        if (typeof handler === 'function') {
            if (this.domain) {
                this.domain.enter();
            }
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default: {
                    const l = arguments.length;
                    const args = new Array(l - 1);
                    for (let i = 1; i < l; i++) {
                        args[i - 1] = arguments[i];
                    }
                    handler.apply(this, args);
                }
            }
            if (this.domain) {
                this.domain.exit();
            }
            return true;
        }
        if (isArray(handler)) {
            if (this.domain) {
                this.domain.enter();
            }
            const l = arguments.length;
            const args = new Array(l - 1);
            for (let i = 1; i < l; i++) {
                args[i - 1] = arguments[i];
            }

            const listeners = handler.slice();
            for (let i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(this, args);
            }
            if (this.domain) {
                this.domain.exit();
            }
            return true;
        }
        return false;
    };

    EventEmitter.prototype.addListener = function (type, listener) {
        if (typeof listener !== 'function') {
            throw new Error('addListener only takes instances of Function');
        }

        if (!this._events) {
            this._events = {};
        }

        // To avoid recursion in the case that type == "newListeners"! Before
        // adding it to the listeners, first emit "newListeners".
        this.emit('newListener', type, typeof listener.listener === 'function' ? listener.listener : listener);

        if (!this._events[type]) {
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        } else if (isArray(this._events[type])) {
            // If we've already got an array, just append.
            this._events[type].push(listener);
        } else {
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];
        }

        // Check for listener leak
        if (isArray(this._events[type]) && !this._events[type].warned) {
            let m;
            if (this._maxListeners !== undefined) {
                m = this._maxListeners;
            } else {
                m = defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
            }
        }

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function (type, listener) {
        if (typeof listener !== 'function') {
            throw new Error('.once only takes instances of Function');
        }

        const self = this;
        function g() {
            self.removeListener(type, g);
            listener.apply(this, arguments);
        }

        g.listener = listener;
        self.on(type, g);

        return this;
    };

    EventEmitter.prototype.removeListener = function (type, listener) {
        if (typeof listener !== 'function') {
            throw new Error('removeListener only takes instances of Function');
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (!this._events?.[type]) {
            return this;
        }

        const list = this._events[type];

        if (isArray(list)) {
            let position = -1;
            for (let i = 0, length = list.length; i < length; i++) {
                if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
                    position = i;
                    break;
                }
            }

            if (position < 0) {
                return this;
            }
            list.splice(position, 1);
        } else if (list === listener || (list.listener && list.listener === listener)) {
            delete this._events[type];
        }

        return this;
    };

    EventEmitter.prototype.removeAllListeners = function (type) {
        if (arguments.length === 0) {
            this._events = {};
            return this;
        }

        const events = this._events?.[type];
        if (!events) {
            return this;
        }

        if (isArray(events)) {
            events.splice(0);
        } else {
            this._events[type] = null;
        }

        return this;
    };

    EventEmitter.prototype.listeners = function (type) {
        if (!this._events) {
            this._events = {};
        }
        if (!this._events[type]) {
            this._events[type] = [];
        }
        if (!isArray(this._events[type])) {
            this._events[type] = [this._events[type]];
        }
        return this._events[type];
    };
})();

((exports, _global) => {
    const Protocol = exports;

    const HEADER = 5;

    const Message = function (id, route, body) {
        this.id = id;
        this.route = route;
        this.body = body;
    };

    /**
     *
     *pofresh client encode
     * id message id;
     * route message route
     * msg message body
     * socketio current support string
     *
     */
    Protocol.encode = (id, route, msg) => {
        const msgStr = JSON.stringify(msg);
        if (route.length > 255) {
            throw new Error('route maxlength is overflow');
        }
        const byteArray = new Uint16Array(HEADER + route.length + msgStr.length);
        let index = 0;
        byteArray[index++] = (id >> 24) & 0xff;
        byteArray[index++] = (id >> 16) & 0xff;
        byteArray[index++] = (id >> 8) & 0xff;
        byteArray[index++] = id & 0xff;
        byteArray[index++] = route.length & 0xff;
        for (let i = 0; i < route.length; i++) {
            byteArray[index++] = route.charCodeAt(i);
        }
        for (let i = 0; i < msgStr.length; i++) {
            byteArray[index++] = msgStr.charCodeAt(i);
        }
        return bt2Str(byteArray, 0, byteArray.length);
    };

    /**
     *
     *client decode
     *msg String data
     *return Message Object
     */
    Protocol.decode = msg => {
        let idx,
            len = msg.length,
            arr = new Array(len);
        for (idx = 0; idx < len; ++idx) {
            arr[idx] = msg.charCodeAt(idx);
        }
        let index = 0;
        const buf = new Uint16Array(arr);
        const id = ((buf[index++] << 24) | (buf[index++] << 16) | (buf[index++] << 8) | buf[index++]) >>> 0;
        const routeLen = buf[HEADER - 1];
        const route = bt2Str(buf, HEADER, routeLen + HEADER);
        const body = bt2Str(buf, routeLen + HEADER, buf.length);
        return new Message(id, route, body);
    };

    const bt2Str = (byteArray, start, end) => {
        let result = '';
        for (let i = start; i < byteArray.length && i < end; i++) {
            result += String.fromCharCode(byteArray[i]);
        }
        return result;
    };
})(typeof module === 'object' ? module.exports : (this.Protocol = {}), this);

(() => {
    if (typeof Object.create !== 'function') {
        Object.create = o => {
            function F() {}
            F.prototype = o;
            return new F();
        };
    }

    const root = window;
    const pofresh = Object.create(EventEmitter.prototype); // object extend from object
    root.pofresh = pofresh;
    let socket = null;
    let id = 1;
    const callbacks = {};

    pofresh.init = (params, cb) => {
        pofresh.params = params;
        params.debug = true;
        const host = params.host;
        const port = params.port;

        let url = `ws://${host}`;
        if (port) {
            url += `:${port}`;
        }

        socket = io(url, { 'force new connection': true, reconnect: false });

        socket.on('connect', () => {
            if (cb) {
                cb(socket);
            }
        });

        socket.on('reconnect', () => {});

        socket.on('message', data => {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (Array.isArray(data)) {
                processMessageBatch(pofresh, data);
            } else {
                processMessage(pofresh, data);
            }
        });

        socket.on('error', _err => {});

        socket.on('disconnect', reason => {
            pofresh.emit('disconnect', reason);
        });
    };

    pofresh.disconnect = () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    };

    pofresh.request = route => {
        if (!route) {
            return;
        }
        let msg = {};
        let cb;
        const args = Array.prototype.slice.apply(arguments);
        if (args.length === 2) {
            if (typeof args[1] === 'function') {
                cb = args[1];
            } else if (typeof args[1] === 'object') {
                msg = args[1];
            }
        } else if (args.length === 3) {
            msg = args[1];
            cb = args[2];
        }
        msg = filter(msg, route);
        id++;
        callbacks[id] = cb;
        const sg = Protocol.encode(id, route, msg);
        socket.send(sg);
    };

    pofresh.notify = function (route, msg) {
        this.request(route, msg);
    };

    const processMessage = (pofresh, msg) => {
        let _route;
        if (msg.id) {
            //if have a id then find the callback function with the request
            const cb = callbacks[msg.id];

            delete callbacks[msg.id];
            if (typeof cb !== 'function') {
                return;
            }

            cb(msg.body);
            return;
        }

        // server push message or old format message
        processCall(msg);

        //if no id then it should be a server push message
        function processCall(msg) {
            const route = msg.route;
            if (route) {
                if (msg.body) {
                    let body = msg.body.body;
                    if (!body) {
                        body = msg.body;
                    }
                    pofresh.emit(route, body);
                } else {
                    pofresh.emit(route, msg);
                }
            } else {
                pofresh.emit(msg.body.route, msg.body);
            }
        }
    };

    const processMessageBatch = (pofresh, msgs) => {
        for (let i = 0, l = msgs.length; i < l; i++) {
            processMessage(pofresh, msgs[i]);
        }
    };

    function filter(msg, route) {
        if (route.indexOf('area.') === 0) {
            msg.areaId = pofresh.areaId;
        }

        msg.timestamp = Date.now();
        return msg;
    }
})();
