import assert from 'node:assert';
import { getAdditionalNames, getInterface } from './settings.js';

describe('settings', function () {
    describe('getAdditionalNames()', function () {
        it('returns an empty list by default', function () {
            const result = getAdditionalNames({});
            assert.deepStrictEqual(result, []);
        });

        it('returns the configured additional names from flat settings', function () {
            const result = getAdditionalNames({
                'mocha/additionalCustomNames': [{ interface: 'BDD', name: 'foo', type: 'suite' }]
            });

            assert.deepStrictEqual(result, [{ interface: 'BDD', name: 'foo', type: 'suite' }]);
        });

        it('returns the configured additional names from nested settings', function () {
            const result = getAdditionalNames({
                mocha: {
                    additionalCustomNames: [{ interface: 'TDD', name: 'bar', type: 'testCase' }]
                }
            });

            assert.deepStrictEqual(result, [{ interface: 'TDD', name: 'bar', type: 'testCase' }]);
        });

        it('throws when additionalCustomNames is not an array', function () {
            assert.throws(
                function () {
                    getAdditionalNames({ 'mocha/additionalCustomNames': 'foo' });
                },
                function (error: unknown) {
                    return error instanceof TypeError &&
                        error.message === 'additionalCustomNames must be an array';
                }
            );
        });

        it('throws when an additionalCustomNames item is not an object', function () {
            assert.throws(
                function () {
                    getAdditionalNames({ 'mocha/additionalCustomNames': ['foo'] });
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'additionalCustomNames item must be an object';
                }
            );
        });

        it('throws when an additionalCustomNames item has an invalid interface', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [{ interface: 'foo', name: 'bar', type: 'suite' }]
                    });
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'additionalCustomNames interface foo is invalid';
                }
            );
        });

        it('throws when an additionalCustomNames item has no valid name', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [{ interface: 'BDD', name: 42, type: 'suite' }]
                    });
                },
                function (error: unknown) {
                    return error instanceof TypeError &&
                        error.message === 'additionalCustomNames name missing or invalid';
                }
            );
        });

        it('throws when an additionalCustomNames item has no valid type', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [{ interface: 'BDD', name: 'bar', type: 42 }]
                    });
                },
                function (error: unknown) {
                    return error instanceof TypeError &&
                        error.message === 'additionalCustomNames type missing or invalid';
                }
            );
        });
    });

    describe('getInterface()', function () {
        it('returns "BDD" by default', function () {
            const result = getInterface({});
            assert.strictEqual(result, 'BDD');
        });

        it('returns the given valid interface', function () {
            const result = getInterface({ 'mocha/interface': 'exports' });
            assert.strictEqual(result, 'exports');
        });

        it('returns the given valid nested interface', function () {
            const result = getInterface({ mocha: { interface: 'TDD' } });
            assert.strictEqual(result, 'TDD');
        });

        it('throws an error when an invalid interface is provided', function () {
            try {
                getInterface({ 'mocha/interface': 'foo' });
                assert.fail('Expected getInterface() to throw but it did not');
            } catch (error: unknown) {
                assert.strictEqual((error as Error).message, 'Invalid value for mocha/interface "foo"');
            }
        });
    });
});
