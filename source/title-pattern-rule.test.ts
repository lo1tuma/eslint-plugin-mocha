import type { Rule } from 'eslint';
import assert from 'node:assert';
import { hasValidOrNoDescription, normalizeOptions } from './title-pattern-rule.js';

describe('title pattern helpers', function () {
    it('normalizeOptions() creates unicode regexes and drops non-string messages', function () {
        const result = normalizeOptions({
            pattern: '^foo$',
            message: 0 as unknown as string
        });

        assert.strictEqual(result.pattern.test('foo'), true);
        assert.strictEqual(result.pattern.unicode, true);
        assert.strictEqual(result.message, undefined);
    });

    it('hasValidOrNoDescription() skips scope lookup when no description argument exists', function () {
        const result = hasValidOrNoDescription(
            {
                sourceCode: {
                    getScope() {
                        throw new Error('Expected missing descriptions to avoid scope lookup.');
                    }
                }
            } as unknown as Rule.RuleContext,
            {
                type: 'CallExpression',
                arguments: []
            } as unknown as Parameters<typeof hasValidOrNoDescription>[1],
            /^foo$/u
        );

        assert.strictEqual(result, true);
    });
});
