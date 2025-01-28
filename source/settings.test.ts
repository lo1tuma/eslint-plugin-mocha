import assert from 'node:assert';
import { suite, test } from 'mocha';
import { getInterface } from './settings.js';

suite('settings', function () {
    suite('getInterface()', function () {
        test('returns "BDD" by default', function () {
            const result = getInterface({});
            assert.strictEqual(result, 'BDD');
        });

        test('returns the given valid interface', function () {
            const result = getInterface({ 'mocha/interface': 'exports' });
            assert.strictEqual(result, 'exports');
        });

        test('throws an error when an invalid interface is provided', function () {
            try {
                getInterface({ 'mocha/interface': 'foo' });
                assert.fail('Expected getInterface() to throw but it did not');
            } catch (error: unknown) {
                assert.strictEqual((error as Error).message, 'Invalid value for mocha/interface "foo"');
            }
        });
    });
});
