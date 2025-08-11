import path from 'path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import app from '../lib/application.js';
import pofresh from '../lib/pofresh.js';

const WAIT_TIME = 1000;
const mockBase = path.join(process.cwd(), 'test');

describe('application test', () => {
    afterEach(() => {
        app.state = 0;
        app.settings = {};
    });

    afterAll(() => {
        setTimeout(() => process.exit(), 500);
    });

    describe('#init', () => {
        it('should init the app instance', () => {
            app.init({ base: mockBase });
            expect(app.state).toBe(1); // magic number from application.js
        });
    });

    describe('#set and get', () => {
        it('should play the role of normal set and get', () => {
            expect(app.get('some undefined key')).toBeUndefined();

            const key = 'some defined key',
                value = 'some value';
            app.set(key, value);
            expect(app.get(key)).toBe(value);
        });

        it('should return the value if pass just one parameter to the set method', () => {
            const key = 'some defined key',
                value = 'some value';
            expect(app.set(key)).toBeUndefined();
            app.set(key, value);
            expect(app.set(key)).toBe(value);
        });
    });

    describe('#enable and disable', () => {
        it('should play the role of enable and disable', () => {
            const key = 'some enable key';
            expect(app.enabled(key)).toBe(false);
            expect(app.disabled(key)).toBe(true);

            app.enable(key);
            expect(app.enabled(key)).toBe(true);
            expect(app.disabled(key)).toBe(false);

            app.disable(key);
            expect(app.enabled(key)).toBe(false);
            expect(app.disabled(key)).toBe(true);
        });
    });

    describe('#component', () => {
        it(
            'should load the component and fire their lifecircle callback by app.start, app.afterStart, app.stop',
            async () => {
                let startCount = 0,
                    afterStartCount = 0,
                    stopCount = 0;

                const mockComponent = {
                    start(cb) {
                        startCount++;
                        cb();
                    },

                    afterStart(cb) {
                        afterStartCount++;
                        cb();
                    },

                    stop(_force, cb) {
                        stopCount++;
                        cb();
                    }
                };

                app.init({ base: mockBase });
                app.load(mockComponent);

                await new Promise((resolve, reject) => {
                    app.start(err => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                // wait for after start
                await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

                await new Promise(resolve => {
                    app.stop(false);
                    setTimeout(resolve, WAIT_TIME);
                });

                // wait for stop and verify
                expect(startCount).toBe(1);
                expect(afterStartCount).toBe(1);
                expect(stopCount).toBe(1);
            },
            WAIT_TIME * 3
        );

        it('should access the component with a name by app.components.name after loaded', () => {
            const key1 = 'key1',
                comp1 = { content: 'some thing in comp1' };
            const comp2 = { name: 'key2', content: 'some thing in comp2' };
            const key3 = 'key3';
            const comp3 = () => ({ content: 'some thing in comp3', name: key3 });

            app.init({ base: mockBase });
            app.load(key1, comp1);
            app.load(comp2);
            app.load(comp3);
            expect(app.components.key1).toEqual(comp1);
            expect(app.components.key2).toEqual(comp2);
            expect(app.components.key3).toEqual(comp3());
        });

        it('should ignore duplicated components', () => {
            const key = 'key';
            const comp1 = { content: 'some thing in comp1' };
            const comp2 = { content: 'some thing in comp2' };

            app.init({ base: mockBase });
            app.load(key, comp1);
            app.load(key, comp2);

            expect(app.components[key]).toEqual(comp1);
            expect(app.components[key]).not.toEqual(comp2);
        });
    });

    describe('#filter', () => {
        it('should add before filter and could fetch it later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.before(filters[i]);
            }

            const filters2 = app.get('__befores__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });

        it('should add after filter and could fetch it later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.after(filters[i]);
            }

            const filters2 = app.get('__afters__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });

        it('should add filter and could fetch it from before and after filter later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.filter(filters[i]);
            }

            const filters2 = app.get('__befores__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }

            const filters3 = app.get('__afters__');
            expect(filters3).toBeDefined();
            expect(filters3.length).toBe(filters.length);
            for (i = 0, l = filters3.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });
    });

    describe('#globalFilter', () => {
        it('should add before global filter and could fetch it later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.globalBefore(filters[i]);
            }

            const filters2 = app.get('__globalBefores__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });

        it('should add after global filter and could fetch it later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.globalAfter(filters[i]);
            }

            const filters2 = app.get('__globalAfters__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });

        it('should add filter and could fetch it from before and after filter later', () => {
            const filters = [
                () => {
                    /* dummy filter */
                },
                () => {
                    /* dummy filter */
                }
            ];

            app.init({ base: mockBase });

            let i, l;
            for (i = 0, l = filters.length; i < l; i++) {
                app.globalFilter(filters[i]);
            }

            const filters2 = app.get('__globalBefores__');
            expect(filters2).toBeDefined();
            expect(filters2.length).toBe(filters.length);
            for (i = 0, l = filters2.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }

            const filters3 = app.get('__globalAfters__');
            expect(filters3).toBeDefined();
            expect(filters3.length).toBe(filters.length);
            for (i = 0, l = filters3.length; i < l; i++) {
                expect(filters2[i]).toBe(filters[i]);
            }
        });
    });

    describe('#configure', () => {
        it('should execute the code block wtih the right environment', () => {
            let proCount = 0,
                devCount = 0;
            const proEnv = 'production',
                devEnv = 'development',
                serverType = 'server';

            app.init({ base: mockBase });
            app.set('serverType', serverType);
            app.set('env', proEnv);

            app.configure(proEnv, serverType, () => {
                proCount++;
            });

            app.configure(devEnv, serverType, () => {
                devCount++;
            });

            app.set('env', devEnv);

            app.configure(proEnv, serverType, () => {
                proCount++;
            });

            app.configure(devEnv, serverType, () => {
                devCount++;
            });

            expect(proCount).toBe(1);
            expect(devCount).toBe(1);
        });

        it('should execute the code block wtih the right server', () => {
            let server1Count = 0,
                server2Count = 0;
            const proEnv = 'production',
                serverType1 = 'server1',
                serverType2 = 'server2';

            app.init({ base: mockBase });
            app.set('serverType', serverType1);
            app.set('env', proEnv);

            app.configure(proEnv, serverType1, () => {
                server1Count++;
            });

            app.configure(proEnv, serverType2, () => {
                server2Count++;
            });

            app.set('serverType', serverType2);

            app.configure(proEnv, serverType1, () => {
                server1Count++;
            });

            app.configure(proEnv, serverType2, () => {
                server2Count++;
            });

            expect(server1Count).toBe(1);
            expect(server2Count).toBe(1);
        });
    });

    describe('#route', () => {
        it('should add route record and could fetch it later', () => {
            const type1 = 'area',
                type2 = 'connector';
            const func1 = () => {
                /* dummy function */
            };
            const func2 = () => {
                /* dummy function */
            };

            app.init({ base: mockBase });

            app.route(type1, func1);
            app.route(type2, func2);

            const routes = app.get('__routes__');
            expect(routes).toBeDefined();
            expect(routes[type1]).toBe(func1);
            expect(routes[type2]).toBe(func2);
        });
    });

    describe('#transaction', () => {
        it('should execute all conditions and handlers', () => {
            const conditions = {
                test1(cb) {
                    cb();
                },
                test2(cb) {
                    cb();
                }
            };
            let flag = 1;
            const handlers = {
                do1(cb) {
                    cb();
                },
                do2(cb) {
                    if (flag < 3) {
                        flag++;
                        cb(new Error('error'));
                    } else {
                        cb();
                    }
                }
            };
            app.transaction('test', conditions, handlers, 5);
        });

        it('shoud execute conditions with error and do not execute handlers', () => {
            const conditions = {
                test1(cb) {
                    cb();
                },
                test2(cb) {
                    cb(new Error('error'));
                },
                test3(cb) {
                    cb();
                }
            };
            const handlers = {
                do1(cb) {
                    cb();
                },
                do2(cb) {
                    cb();
                }
            };
            app.transaction('test', conditions, handlers);
        });
    });

    describe('#add and remove servers', () => {
        it('should add servers and emit event and fetch the new server info by get methods', async () => {
            const newServers = [
                {
                    id: 'connector-server-1',
                    serverType: 'connector',
                    host: '127.0.0.1',
                    port: 1234,
                    clientPort: 3000,
                    frontend: true
                },
                {
                    id: 'area-server-1',
                    serverType: 'area',
                    host: '127.0.0.1',
                    port: 2234
                }
            ];
            app.init({ base: mockBase });

            await new Promise(resolve => {
                app.event.on(pofresh.events.ADD_SERVERS, servers => {
                    // check event args
                    expect(servers).toEqual(newServers);

                    // check servers
                    const curServers = app.getServers();
                    expect(curServers).toBeDefined();
                    let item, i, l;
                    for (i = 0, l = newServers.length; i < l; i++) {
                        item = newServers[i];
                        expect(curServers[item.id]).toEqual(item);
                    }

                    // check get server by id
                    for (i = 0, l = newServers.length; i < l; i++) {
                        item = newServers[i];
                        expect(app.getServerById(item.id)).toEqual(item);
                    }

                    // check server types
                    const types = [];
                    for (i = 0, l = newServers.length; i < l; i++) {
                        item = newServers[i];
                        if (types.indexOf(item.serverType) < 0) {
                            types.push(item.serverType);
                        }
                    }
                    const types2 = app.getServerTypes();
                    expect(types2.length).toBe(types.length);
                    for (i = 0, l = types.length; i < l; i++) {
                        expect(types2).toContain(types[i]);
                    }

                    // check server type list
                    let slist;
                    for (i = 0, l = newServers.length; i < l; i++) {
                        item = newServers[i];
                        slist = app.getServersByType(item.serverType);
                        expect(slist).toBeDefined();
                        expect(containsValue(slist, item)).toBe(true);
                    }

                    resolve();
                });

                app.addServers(newServers);
            });
        });

        it('should remove server info and emit event', async () => {
            const newServers = [
                {
                    id: 'connector-server-1',
                    serverType: 'connector',
                    host: '127.0.0.1',
                    port: 1234,
                    clientPort: 3000,
                    frontend: true
                },
                {
                    id: 'area-server-1',
                    serverType: 'area',
                    host: '127.0.0.1',
                    port: 2234
                },
                {
                    id: 'path-server-1',
                    serverType: 'path',
                    host: '127.0.0.1',
                    port: 2235
                }
            ];
            const destServers = [
                {
                    id: 'connector-server-1',
                    serverType: 'connector',
                    host: '127.0.0.1',
                    port: 1234,
                    clientPort: 3000,
                    frontend: true
                },
                {
                    id: 'path-server-1',
                    serverType: 'path',
                    host: '127.0.0.1',
                    port: 2235
                }
            ];
            const delIds = ['area-server-1'];
            let _addCount = 0;
            const _delCount = 0;

            app.init({ base: mockBase });
            app.event.on(pofresh.events.ADD_SERVERS, servers => {
                // check event args
                expect(servers).toEqual(newServers);
                _addCount++;
            });

            await new Promise(resolve => {
                app.event.on(pofresh.events.REMOVE_SERVERS, ids => {
                    expect(ids).toEqual(delIds);

                    // check servers
                    const curServers = app.getServers();
                    expect(curServers).toBeDefined();
                    let item, i, l;
                    for (i = 0, l = destServers.length; i < l; i++) {
                        item = destServers[i];
                        expect(curServers[item.id]).toEqual(item);
                    }

                    // check get server by id
                    for (i = 0, l = destServers.length; i < l; i++) {
                        item = destServers[i];
                        expect(app.getServerById(item.id)).toEqual(item);
                    }

                    // check server types
                    // NOTICE: server types would not clear when remove server from app
                    const types = [];
                    for (i = 0, l = newServers.length; i < l; i++) {
                        item = newServers[i];
                        if (types.indexOf(item.serverType) < 0) {
                            types.push(item.serverType);
                        }
                    }
                    const types2 = app.getServerTypes();
                    expect(types2.length).toBe(types.length);
                    for (i = 0, l = types.length; i < l; i++) {
                        expect(types2).toContain(types[i]);
                    }

                    // check server type list
                    let slist;
                    for (i = 0, l = destServers.length; i < l; i++) {
                        item = destServers[i];
                        slist = app.getServersByType(item.serverType);
                        expect(slist).toBeDefined();
                        expect(containsValue(slist, item)).toBe(true);
                    }

                    resolve();
                });

                app.addServers(newServers);
                app.removeServers(delIds);
            });
        });
    });

    describe('#use', () => {
        it('should exist plugin component and event', () => {
            const plugin = {
                components: `${mockBase}/mock-plugin/components/`,
                events: `${mockBase}/mock-plugin/events/`
            };
            const opts = {};
            app.use(plugin, opts);
            expect(app.event.listeners('bind_session')).toBeDefined();
            expect(app.components.mockPlugin).toBeDefined();
        });
    });
});

function containsValue(slist, sinfo) {
    for (let i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === sinfo.id) {
            return true;
        }
    }
    return false;
}
