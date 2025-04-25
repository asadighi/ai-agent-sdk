import { describe, it, expect } from 'vitest';
import { Tokens } from './tokens';
describe('Tokens', () => {
    it('should export all required tokens', () => {
        expect(Tokens.Logger).toBeDefined();
        expect(Tokens.Storage).toBeDefined();
        expect(Tokens.Config).toBeDefined();
        expect(Tokens.EventBus).toBeDefined();
    });
    it('should have unique symbols for each token', () => {
        const symbols = new Set(Object.values(Tokens));
        expect(symbols.size).toBe(Object.keys(Tokens).length);
    });
    it('should have descriptive symbol descriptions', () => {
        expect(Tokens.Logger.toString()).toContain('Logger');
        expect(Tokens.Storage.toString()).toContain('Storage');
        expect(Tokens.Config.toString()).toContain('Config');
        expect(Tokens.EventBus.toString()).toContain('EventBus');
    });
});
//# sourceMappingURL=tokens.test.js.map