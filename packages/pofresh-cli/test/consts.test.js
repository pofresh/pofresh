import { describe, it, expect } from 'vitest';
import consts from '../lib/consts.js';

describe('consts', () => {
    it('should export constants object', () => {
        expect(consts).toBeDefined();
        expect(typeof consts).toBe('object');
    });

    it('should have CONSOLE_MODULE constant', () => {
        expect(consts.CONSOLE_MODULE).toBe('__console__');
    });

    it('should have PROMPT constant', () => {
        expect(consts.PROMPT).toBe('@pofresh : ');
    });

    it('should have welcome information', () => {
        expect(Array.isArray(consts.WELCOME_INFO)).toBe(true);
        expect(consts.WELCOME_INFO.length).toBeGreaterThan(0);
        expect(consts.WELCOME_INFO[0]).toContain('Welcome to Pofresh');
    });

    it('should have help information arrays', () => {
        expect(Array.isArray(consts.HELP_INFO_1)).toBe(true);
        expect(Array.isArray(consts.HELP_INFO_2)).toBe(true);
        expect(Array.isArray(consts.HELP_LOGIN)).toBe(true);
    });

    it('should have commands list', () => {
        expect(Array.isArray(consts.COMANDS_ALL)).toBe(true);
        expect(consts.COMANDS_ALL.length).toBeGreaterThan(0);
        // Check header row
        expect(consts.COMANDS_ALL[0]).toEqual(['command', '  description']);
    });

    it('should have commands map with help information', () => {
        expect(typeof consts.COMANDS_MAP).toBe('object');
        expect(consts.COMANDS_MAP.help).toBe(1);
        expect(Array.isArray(consts.COMANDS_MAP.show)).toBe(true);
    });

    it('should have command completion info', () => {
        expect(typeof consts.COMANDS_COMPLETE_INFO).toBe('object');
        expect(consts.COMANDS_COMPLETE_INFO.help).toBe(1);
        expect(consts.COMANDS_COMPLETE_INFO.show).toBe(1);
    });

    it('should have show commands', () => {
        expect(typeof consts.SHOW_COMMAND).toBe('object');
        expect(consts.SHOW_COMMAND.servers).toBe(1);
        expect(consts.SHOW_COMMAND.connections).toBe(1);
    });

    it('should have ASCII logo', () => {
        expect(Array.isArray(consts.ASCII_LOGO)).toBe(true);
        expect(consts.ASCII_LOGO.length).toBeGreaterThan(0);
        // ASCII logo contains stylized text, not literal "POFRESH"
        expect(consts.ASCII_LOGO[0]).toContain('______');
    });

    it('should have commands complete array', () => {
        expect(Array.isArray(consts.COMANDS_COMPLETE)).toBe(true);
        expect(consts.COMANDS_COMPLETE).toContain('help');
        expect(consts.COMANDS_COMPLETE).toContain('show');
        expect(consts.COMANDS_COMPLETE).toContain('quit');
    });

    it('should have error messages', () => {
        expect(typeof consts.COMANDS_ERROR).toBe('string');
        expect(typeof consts.KILL_QUESTION_INFO).toBe('string');
        expect(consts.KILL_QUESTION_INFO).toContain('kill all servers');
    });
});
