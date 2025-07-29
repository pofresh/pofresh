import cli from '../index.js';

describe('pofresh-cli', () => {
    it('should export main CLI functionality', () => {
        expect(cli).toBeDefined();
        expect(typeof cli).toBe('function');
    });

    it('should be the same as lib/cli export', () => {
        const libCli = require('../lib/cli');
        expect(cli).toBe(libCli);
    });
});
