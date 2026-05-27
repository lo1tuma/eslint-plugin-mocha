import assert from 'node:assert';
import { isLiteralOrUndefinedReturn } from './mocha-return-rule.js';

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
});
