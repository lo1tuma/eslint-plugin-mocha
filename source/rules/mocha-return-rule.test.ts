import assert from 'node:assert';
import { suite, test } from 'mocha';
import { isLiteralOrUndefinedReturn } from './mocha-return-rule.ts';

suite('mocha-return-rule helpers', function () {
    test('treats bare returns as allowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement',
                argument: null
            } as never),
            true
        );
    });

    test('treats literal returns as allowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement',
                argument: { type: 'Literal', value: 'value' }
            } as never),
            true
        );
    });

    test('treats missing return arguments as disallowed', function () {
        assert.strictEqual(
            isLiteralOrUndefinedReturn({
                type: 'ReturnStatement'
            } as never),
            false
        );
    });
});
