import { describe, it, expect } from 'vitest';
import { client as Client } from '../../index.js';

describe('mailstation', () => {
  it('should create mailstation successfully', () => {
    const client = Client.create();
    expect(client).toBeDefined();
    expect(client.start).toBeDefined();
    expect(client.stop).toBeDefined();
  });

  it('should add server successfully', () => {
    const client = Client.create();
    const server = { id: 'test-server-1', serverType: 'test', host: '127.0.0.1', port: 3333 };
    
    client.addServer(server);
    expect(client._station).toBeDefined();
  });

  it('should add servers successfully', () => {
    const client = Client.create();
    const servers = [
      { id: 'test-server-1', serverType: 'test', host: '127.0.0.1', port: 3333 },
      { id: 'test-server-2', serverType: 'test', host: '127.0.0.1', port: 3334 }
    ];
    
    client.addServers(servers);
    expect(client._station).toBeDefined();
  });
});