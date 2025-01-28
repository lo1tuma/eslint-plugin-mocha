/* eslint-disable @cspell/spellchecker -- generated names shouldn’t be checked */
import assert from 'node:assert';
import { buildAllNameDetailsWithVariants } from './name-details.js';

describe('mocha names', function () {
    describe('buildAllNameDetailsWithVariants()', function () {
        it('returns an empty list if an empty list is given', function () {
            const nameDetailsList = buildAllNameDetailsWithVariants([]);

            assert.deepStrictEqual(nameDetailsList, []);
        });

        it('returns the name details for a suite itself and all its variants', function () {
            const nameDetailsList = buildAllNameDetailsWithVariants([{
                path: ['foo'],
                interface: 'BDD',
                type: 'suite',
                modifier: null,
                config: null
            }]);

            assert.deepStrictEqual(nameDetailsList, [
                {
                    config: null,
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()'
                    ],
                    path: [
                        'foo'
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()'
                    ],
                    path: [
                        'foo',
                        'skip'
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'xfoo()'
                    ],
                    path: [
                        'xfoo'
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()'
                    ],
                    path: [
                        'foo',
                        'only'
                    ],
                    type: 'suite'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'xfoo()',
                        'timeout()'
                    ],
                    path: [
                        'xfoo',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'xfoo()',
                        'slow()'
                    ],
                    path: [
                        'xfoo',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'xfoo()',
                        'retries()'
                    ],
                    path: [
                        'xfoo',
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'retries'
                    ],
                    type: 'config'
                }
            ]);
        });
    });
});
