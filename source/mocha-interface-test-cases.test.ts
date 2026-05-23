import assert from 'node:assert';
import { withInterface } from './mocha-interface-test-cases.js';

describe('mocha-interface-test-cases', function () {
    it('adds interface settings to string test cases', function () {
        const result = withInterface('TDD', 'test()');

        assert.deepStrictEqual(result, {
            code: 'test()',
            settings: {
                'mocha/interface': 'TDD',
                mocha: {
                    interface: 'TDD'
                }
            }
        });
    });

    it('merges interface settings into object test cases', function () {
        const result = withInterface('BDD', {
            code: 'describe()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'suite', interface: 'BDD' }]
                },
                foo: 'bar'
            }
        });

        assert.deepStrictEqual(result, {
            code: 'describe()',
            settings: {
                'mocha/interface': 'BDD',
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'suite', interface: 'BDD' }],
                    interface: 'BDD'
                },
                foo: 'bar'
            }
        });
    });
});
