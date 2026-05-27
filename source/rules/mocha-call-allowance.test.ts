import assert from 'node:assert';
import {
    defaultAllowMochaCallOption,
    normalizeMochaCallName
} from './mocha-call-allowance.js';

describe('mocha-call-allowance helpers', function () {
    it('exposes the expected default option', function () {
        assert.deepStrictEqual(defaultAllowMochaCallOption, { allow: [] });
    });

    it('normalizes bare call names', function () {
        assert.strictEqual(normalizeMochaCallName('beforeEach'), 'beforeEach()');
    });

    it('preserves already normalized call names', function () {
        assert.strictEqual(normalizeMochaCallName('beforeEach()'), 'beforeEach()');
    });

    it('returns an empty name for non-string values', function () {
        assert.strictEqual(normalizeMochaCallName(1), '');
    });
});
