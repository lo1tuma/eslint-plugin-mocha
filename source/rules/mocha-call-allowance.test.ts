import assert from 'node:assert';
import { suite, test } from 'mocha';
import {
    defaultAllowMochaCallOption,
    normalizeMochaCallName
} from './mocha-call-allowance.ts';

suite('mocha-call-allowance helpers', function () {
    test('exposes the expected default option', function () {
        assert.deepStrictEqual(defaultAllowMochaCallOption, { allow: [] });
    });

    test('normalizes bare call names', function () {
        assert.strictEqual(normalizeMochaCallName('beforeEach'), 'beforeEach()');
    });

    test('preserves already normalized call names', function () {
        assert.strictEqual(normalizeMochaCallName('beforeEach()'), 'beforeEach()');
    });

    test('returns an empty name for non-string values', function () {
        assert.strictEqual(normalizeMochaCallName(1), '');
    });
});
