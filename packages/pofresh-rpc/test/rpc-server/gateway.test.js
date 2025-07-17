import { describe, it, expect } from 'vitest';
import { server as Server } from '../../index.js';

const paths = [
  { namespace: 'user', path: __dirname + '/../mock-remote/area' },
  { namespace: 'sys', path: __dirname + '/../mock-remote/connector' }
];

describe('gateway', () => {
  it('should create gateway successfully', () => {
    const port = 3333;
    const server = Server.create({
      paths: paths,
      port: port
    });
    
    expect(server).toBeDefined();
    expect(server.start).toBeDefined();
    expect(server.stop).toBeDefined();
  });
});