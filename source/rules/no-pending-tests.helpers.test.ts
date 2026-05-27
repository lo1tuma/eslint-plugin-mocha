import type { Rule, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    fixPendingIdentifier,
    fixPendingMemberExpression,
    isPendingMemberExpression,
    noPendingTestsRule
} from './no-pending-tests.js';

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

function asRuleFixer(fixer: Record<string, unknown>): Rule.RuleFixer {
    return fixer as unknown as Rule.RuleFixer;
}

function asRuleFix(fix: Record<string, unknown>): Rule.Fix {
    return fix as unknown as Rule.Fix;
}

describe('no-pending-tests helpers', function () {
    it('fixPendingIdentifier() returns null for identifiers without an x prefix', function () {
        const result = fixPendingIdentifier(
            asRuleFixer({
                replaceText() {
                    return asRuleFix({});
                }
            }),
            {
                type: 'Identifier',
                name: 'describe'
            } as never
        );

        assert.strictEqual(result, null);
    });

    it('isPendingMemberExpression() returns false for non-member-expression callees', function () {
        const result = isPendingMemberExpression({ type: 'Identifier', name: 'xdescribe' } as never);

        assert.strictEqual(result, false);
    });

    it('isPendingMemberExpression() returns false for non-skip named properties', function () {
        const result = isPendingMemberExpression({
            type: 'MemberExpression',
            computed: false,
            object: { type: 'Identifier', name: 'it' },
            property: { type: 'Identifier', name: 'only' }
        } as never);

        assert.strictEqual(result, false);
    });

    it('isPendingMemberExpression() returns false for non-skip computed properties', function () {
        const result = isPendingMemberExpression({
            type: 'MemberExpression',
            computed: true,
            object: { type: 'Identifier', name: 'it' },
            property: { type: 'Literal', value: 'only' }
        } as never);

        assert.strictEqual(result, false);
    });

    it('fixPendingMemberExpression() returns null when the member-expression range is missing', function () {
        const result = fixPendingMemberExpression(
            asRuleFixer({
                replaceTextRange() {
                    return asRuleFix({});
                }
            }),
            asSourceCode({
                getText() {
                    return 'describe';
                }
            }),
            {
                type: 'MemberExpression',
                computed: false,
                object: { type: 'Identifier', name: 'describe' },
                property: { type: 'Identifier', name: 'skip' },
                range: undefined
            } as never
        );

        assert.strictEqual(result, null);
    });

    it('should disallow skipped tests without comments by default', function () {
        assert.deepStrictEqual(noPendingTestsRule.meta?.defaultOptions, [{ allowSkippedWithComment: false }]);
    });
});
