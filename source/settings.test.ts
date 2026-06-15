import assert from 'node:assert';
import { suite, test } from 'mocha';
import { getAdditionalNames, getInterface } from './settings.ts';

suite('settings', function () {
    suite('getAdditionalNames()', function () {
        test('returns an empty list by default', function () {
            const result = getAdditionalNames({});
            assert.deepStrictEqual(result, []);
        });

        test('returns the configured additional names from flat settings', function () {
            const result = getAdditionalNames({
                'mocha/additionalCustomNames': [ { interface: 'BDD', name: 'foo', type: 'suite' } ]
            });

            assert.deepStrictEqual(result, [ { interface: 'BDD', name: 'foo', type: 'suite' } ]);
        });

        test('returns the configured additional names from nested settings', function () {
            const result = getAdditionalNames({
                mocha: {
                    additionalCustomNames: [ { interface: 'BDD', name: 'prepareTestContexts', type: 'hook' } ]
                }
            });

            assert.deepStrictEqual(result, [ { interface: 'BDD', name: 'prepareTestContexts', type: 'hook' } ]);
        });

        test('throws when additionalCustomNames is not an array', function () {
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

        test('throws when an additionalCustomNames item is not an object', function () {
            assert.throws(
                function () {
                    getAdditionalNames({ 'mocha/additionalCustomNames': [ 'foo' ] });
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'additionalCustomNames item must be an object';
                }
            );
        });

        test('throws when an additionalCustomNames item has an invalid interface', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [ { interface: 'foo', name: 'bar', type: 'suite' } ]
                    });
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'additionalCustomNames interface foo is invalid';
                }
            );
        });

        test('throws when an additionalCustomNames item has no valid name', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [ { interface: 'BDD', name: 42, type: 'suite' } ]
                    });
                },
                function (error: unknown) {
                    return error instanceof TypeError &&
                        error.message === 'additionalCustomNames name missing or invalid';
                }
            );
        });

        test('throws when an additionalCustomNames item has no valid type', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [ { interface: 'BDD', name: 'bar', type: 42 } ]
                    });
                },
                function (error: unknown) {
                    return error instanceof TypeError &&
                        error.message === 'additionalCustomNames type missing or invalid';
                }
            );
        });

        test('throws when an additionalCustomNames item has an unknown type', function () {
            assert.throws(
                function () {
                    getAdditionalNames({
                        'mocha/additionalCustomNames': [ { interface: 'BDD', name: 'bar', type: 'config' } ]
                    });
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'additionalCustomNames type config is invalid';
                }
            );
        });
    });

    suite('getInterface()', function () {
        test('returns "BDD" by default', function () {
            const result = getInterface({});
            assert.strictEqual(result, 'BDD');
        });

        test('returns the given valid interface', function () {
            const result = getInterface({ 'mocha/interface': 'require' });
            assert.strictEqual(result, 'require');
        });

        test('returns the given valid nested interface', function () {
            const result = getInterface({ mocha: { interface: 'TDD' } });
            assert.strictEqual(result, 'TDD');
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
