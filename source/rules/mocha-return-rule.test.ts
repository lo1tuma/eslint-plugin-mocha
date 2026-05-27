import type { Rule } from 'eslint';
import assert from 'node:assert';
import {
    isLiteralOrUndefinedReturn,
    reportIfImplicitReturn,
    reportUnexpectedReturnInBlock
} from './mocha-return-rule.js';

describe('mocha-return-rule helpers', function () {
    it('treats bare returns as allowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement',
                argument: null
            } as never),
            true
        );
    });

    it('treats literal returns as allowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement',
                argument: { type: 'Literal', value: 'value' }
            } as never),
            true
        );
    });

    it('treats missing return arguments as disallowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement'
            } as never),
            false
        );
    });

    it('reports implicit returns from non-block bodies', function () {
        const reports: string[] = [];
        const result = reportIfImplicitReturn(
            {
                report() {
                    reports.push('reported');
                }
            } as unknown as Rule.RuleContext,
            {
                body: { type: 'Identifier', name: 'value' }
            } as never,
            'unexpectedReturn'
        );

        assert.strictEqual(result, true);
        assert.deepStrictEqual(reports, ['reported']);
    });

    it('ignores explicit block bodies for implicit return checks', function () {
        const reports: string[] = [];
        const result = reportIfImplicitReturn(
            {
                report() {
                    reports.push('reported');
                }
            } as unknown as Rule.RuleContext,
            {
                body: { type: 'BlockStatement', body: [] }
            } as never,
            'unexpectedReturn'
        );

        assert.strictEqual(result, false);
        assert.deepStrictEqual(reports, []);
    });

    it('reports unexpected block returns when the predicate rejects them', function () {
        const reports: string[] = [];

        reportUnexpectedReturnInBlock(
            {
                report() {
                    reports.push('reported');
                }
            } as unknown as Rule.RuleContext,
            {
                body: {
                    type: 'BlockStatement',
                    body: [{
                        type: 'ReturnStatement',
                        argument: { type: 'Identifier', name: 'value' }
                    }]
                }
            } as never,
            'unexpectedReturn',
            function () {
                return false;
            }
        );

        assert.deepStrictEqual(reports, ['reported']);
    });
});
