import assert from 'node:assert';
import {
    hasMemberCallee,
    validateNumericMochaConfigLimitOption
} from './mocha-config-value-rule.js';

describe('mocha-config-value-rule helpers', function () {
    it('detects member callees', function () {
        assert.strictEqual(
            hasMemberCallee({
                callee: {
                    type: 'MemberExpression'
                }
            } as never),
            true
        );
    });

    it('rejects non-member callees', function () {
        assert.strictEqual(
            hasMemberCallee({
                callee: {
                    type: 'Identifier'
                }
            } as never),
            false
        );
    });

    it('validateNumericMochaConfigLimitOption() allows equal range bounds', function () {
        assert.doesNotThrow(() => {
            validateNumericMochaConfigLimitOption({ mode: 'range', min: 1, max: 1 });
        });
    });
});
