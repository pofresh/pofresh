import { describe, expect, it } from 'vitest';
import { client as Client } from '../../index.js';

const records = [
    {
        namespace: 'user',
        serverType: 'area',
        path: `${__dirname}/../mock-remote/area`
    },
    {
        namespace: 'sys',
        serverType: 'connector',
        path: `${__dirname}/../mock-remote/connector`
    }
];

const serverList = [
    { id: 'area-server-1', serverType: 'area', host: '127.0.0.1', port: 13_333 },
    {
        id: 'connector-server-1',
        serverType: 'connector',
        host: '127.0.0.1',
        port: 14_444
    }
];

describe('client', () => {
    describe('#create', () => {
        it('should create client successfully', () => {
            const client = Client.create({ context: {} });
            expect(client).toBeDefined();
            expect(client.start).toBeDefined();
            expect(client.stop).toBeDefined();
        });

        it('should add proxy instances by addProxies method', () => {
            const client = Client.create({ context: {} });
            client.addProxies(records);

            const proxies = client.proxies;
            expect(proxies).toBeDefined();
        });

        it('should add server by addServer method', () => {
            const client = Client.create({ context: {} });
            client.addServer(serverList[0]);

            expect(client._station).toBeDefined();
        });

        it('should add servers by addServers method', () => {
            const client = Client.create({ context: {} });
            client.addServers(serverList);

            expect(client._station).toBeDefined();
        });
    });

    describe('#status', () => {
        it('should have correct initial state', () => {
            const client = Client.create({ context: {} });
            expect(client.state).toBe(1); // STATE_INITED
        });

        it('should have proxies object', () => {
            const client = Client.create({ context: {} });
            expect(client.proxies).toBeDefined();
            expect(typeof client.proxies).toBe('object');
        });
    });
});
