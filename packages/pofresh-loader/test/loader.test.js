import path from 'path';
import Loader from '../index.js';

const testPath = path.join(__dirname, 'mock-remote/area/');

describe('loader', () => {
    describe('#load', () => {
        it('should load all modules under the path but sub-directory', () => {
            const services = Loader.load(testPath);
            expect(services).toBeDefined();
            expect(services).toHaveProperty('addOneRemote');
            expect(services.addOneRemote).toBeTypeOf('object');
            expect(services.addOneRemote).toHaveProperty('doService');
            expect(services.addOneRemote.doService).toBeTypeOf('function');
            expect(services.addOneRemote).toHaveProperty('doAddTwo');
            expect(services.addOneRemote.doAddTwo).toBeTypeOf('function');

            expect(services).toHaveProperty('addThreeRemote');
            expect(services.addThreeRemote).toBeTypeOf('object');
            expect(services.addThreeRemote).toHaveProperty('doService');
            expect(services.addThreeRemote.doService).toBeTypeOf('function');

            // should use the name as module name if the module has a name property
            expect(services).toHaveProperty('whoAmIRemote');
            expect(services.whoAmIRemote).toBeTypeOf('object');
            expect(services.whoAmIRemote).toHaveProperty('doService');
            expect(services.whoAmIRemote.doService).toBeTypeOf('function');
            expect(services.whoAmIRemote).toHaveProperty('name');
            expect(services.whoAmIRemote.name).toBeTypeOf('string');
        });

        it('should invoke functions of loaded object successfully', async () => {
            let callbackCount = 0;
            const sid = 'area-server-1';
            const context = { id: sid };
            const services = Loader.load(testPath, context);
            expect(services).toBeDefined();

            const promises = [];

            promises.push(
                new Promise(resolve => {
                    services.addOneRemote.doService(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(2);
                        resolve();
                    });
                })
            );

            promises.push(
                new Promise(resolve => {
                    services.addOneRemote.doAddTwo(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(3);
                        resolve();
                    });
                })
            );

            promises.push(
                new Promise(resolve => {
                    services.addThreeRemote.doService(1, (_err, res) => {
                        callbackCount++;
                        expect(res).toBe(4);
                        resolve();
                    });
                })
            );

            // context should be pass to factory function for each module
            promises.push(
                new Promise(resolve => {
                    services.whoAmIRemote.doService((_err, res) => {
                        callbackCount++;
                        expect(res).toBe(sid);
                        resolve();
                    });
                })
            );

            await Promise.all(promises);
            expect(callbackCount).toBe(4);
        });

        it('should throw an error if the path is empty', () => {
            const emptyPath = './mock-remote/connector';
            expect(() => {
                return Loader.load(emptyPath);
            }).toThrow();
        });

        it('should throw exception if the path dose not exist', () => {
            const errorPath = './some/error/path';
            expect(() => {
                return Loader.load(errorPath);
            }).toThrow();
        });

        it('should reload module', () => {
            const servicePath = path.join(__dirname, 'mock-remote/service');
            let services = Loader.load(servicePath);
            expect(services).toBeDefined();
            services.reloadService.doService((_err, res) => {
                expect(res).toBe(1);
            });

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(2);
            });

            services = Loader.load(servicePath, null, true);
            expect(services).toBeDefined();

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(1);
            });

            services.reloadService.doService((_err, res) => {
                expect(res).toBe(2);
            });
        });
    });
});
