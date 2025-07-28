import logger from '../index.js';

describe('pofresh-logger', () => {
    it('should export main logger functionality', () => {
        expect(logger).toBeDefined();
        expect(typeof logger).toBe('object');
    });

    it('should be the same as lib/logger export', () => {
        const libLogger = require('../lib/logger');
        expect(logger).toBe(libLogger);
    });

    it('should have required methods', () => {
        expect(typeof logger.getLogger).toBe('function');
        expect(typeof logger.configure).toBe('function');
        expect(typeof logger.shutdown).toBe('function');
        expect(typeof logger.connectLogger).toBe('function');
    });

    it('should have levels and addLayout properties', () => {
        expect(logger.levels).toBeDefined();
        expect(typeof logger.addLayout).toBe('function');
    });
});
