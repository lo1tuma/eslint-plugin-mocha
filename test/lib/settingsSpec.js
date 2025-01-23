import assert from 'node:assert';
import { getInterface } from '../../lib/settings.js';

describe('settings', function () {
    describe('getInterface()', function () {
        it('returns "BDD" by default', function () {
            const result = getInterface({});
            assert.strictEqual(result, 'BDD');
        });

        it('returns the given valid interface', function () {
            const result = getInterface({ 'mocha/interface': 'exports' });
            assert.strictEqual(result, 'exports');
        });

        it('throws an error when an invalid interface is provided', function () {
            try {
                getInterface({ 'mocha/interface': 'foo' });
                assert.fail('Expected getInterface() to throw but it did not');
            } catch (error) {
                assert.strictEqual(error.message, 'Invalid value for mocha/interface "foo"');
            }
        });
    });
});
