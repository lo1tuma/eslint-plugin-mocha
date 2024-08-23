import assert from 'node:assert';
import { getSuiteNames, getTestCaseNames } from '../../lib/util/names.js';

describe('mocha names', function () {
    describe('test case names', function () {
        it('returns the list of basic test case names when no options are provided', function () {
            const testCaseNames = getTestCaseNames();

            assert.deepStrictEqual(testCaseNames, [
                'it',
                'specify',
                'test'
            ]);
        });

        it('returns an empty list when no modifiers and no base names are wanted', function () {
            const testCaseNames = getTestCaseNames({ modifiersOnly: true, modifiers: [] });

            assert.deepStrictEqual(testCaseNames, []);
        });

        it('ignores invalid modifiers', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['foo'], modifiersOnly: true });

            assert.deepStrictEqual(testCaseNames, []);
        });

        it('returns the list of test case names with and without "skip" modifiers applied', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['skip'] });

            assert.deepStrictEqual(testCaseNames, [
                'it',
                'specify',
                'test',
                'it.skip',
                'specify.skip',
                'test.skip',
                'xit',
                'xspecify'
            ]);
        });

        it('returns the list of test case names only with "skip" modifiers applied', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['skip'], modifiersOnly: true });

            assert.deepStrictEqual(testCaseNames, [
                'it.skip',
                'specify.skip',
                'test.skip',
                'xit',
                'xspecify'
            ]);
        });

        it('returns the list of test case names with and without "only" modifiers applied', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['only'] });

            assert.deepStrictEqual(testCaseNames, [
                'it',
                'specify',
                'test',
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the list of test case names only with "only" modifiers applied', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['only'], modifiersOnly: true });

            assert.deepStrictEqual(testCaseNames, [
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the list of all test case names', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['skip', 'only'] });

            assert.deepStrictEqual(testCaseNames, [
                'it',
                'specify',
                'test',
                'it.skip',
                'specify.skip',
                'test.skip',
                'xit',
                'xspecify',
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the list of test case names only with modifiers applied', function () {
            const testCaseNames = getTestCaseNames({ modifiers: ['skip', 'only'], modifiersOnly: true });

            assert.deepStrictEqual(testCaseNames, [
                'it.skip',
                'specify.skip',
                'test.skip',
                'xit',
                'xspecify',
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the additional test case names', function () {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: ['BDD'] }
                ]
            });

            assert.deepStrictEqual(testCaseNames, [
                'it',
                'specify',
                'test',
                'myCustomIt'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', function () {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: ['BDD'] }
                ],
                modifiersOnly: true
            });

            assert.deepStrictEqual(testCaseNames, []);
        });

        it('returns the additional skip modifiers', function () {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: ['BDD'] },
                    { name: 'myCustomTest', type: 'testCase', interfaces: ['TDD'] }
                ],
                modifiersOnly: true,
                modifiers: ['skip']
            });

            assert.deepStrictEqual(testCaseNames, [
                'it.skip',
                'specify.skip',
                'test.skip',
                'myCustomIt.skip',
                'myCustomTest.skip',
                'xit',
                'xspecify',
                'xmyCustomIt'
            ]);
        });
    });

    describe('suite names', function () {
        it('returns the list of basic suite names when no options are provided', function () {
            const suiteNames = getSuiteNames();

            assert.deepStrictEqual(suiteNames, [
                'describe',
                'context',
                'suite'
            ]);
        });

        it('returns an empty list when no modifiers and no base names are wanted', function () {
            const suiteNames = getSuiteNames({ modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, []);
        });

        it('ignores invalid modifiers', function () {
            const suiteNames = getSuiteNames({ modifiers: ['foo'], modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, []);
        });

        it('returns the list of suite names with and without "skip" modifiers applied', function () {
            const suiteNames = getSuiteNames({ modifiers: ['skip'] });

            assert.deepStrictEqual(suiteNames, [
                'describe',
                'context',
                'suite',
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext'
            ]);
        });

        it('returns the list of suite names only with "skip" modifiers applied', function () {
            const suiteNames = getSuiteNames({ modifiers: ['skip'], modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, [
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext'
            ]);
        });

        it('returns the list of suite names with and without "only" modifiers applied', function () {
            const suiteNames = getSuiteNames({ modifiers: ['only'] });

            assert.deepStrictEqual(suiteNames, [
                'describe',
                'context',
                'suite',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of suite names only with "only" modifiers applied', function () {
            const suiteNames = getSuiteNames({ modifiers: ['only'], modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, [
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of all suite names', function () {
            const suiteNames = getSuiteNames({ modifiers: ['skip', 'only'] });

            assert.deepStrictEqual(suiteNames, [
                'describe',
                'context',
                'suite',
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of suite names only with modifiers applied', function () {
            const suiteNames = getSuiteNames({ modifiers: ['skip', 'only'], modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, [
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the additional suite names', function () {
            const suiteNames = getSuiteNames({
                additionalCustomNames: [
                    { name: 'myCustomDescribe', type: 'suite', interfaces: ['BDD'] }
                ]
            });

            assert.deepStrictEqual(suiteNames, [
                'describe',
                'context',
                'suite',
                'myCustomDescribe'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', function () {
            const suiteNames = getSuiteNames({ additionalSuiteNames: ['myCustomDescribe'], modifiersOnly: true });

            assert.deepStrictEqual(suiteNames, []);
        });

        it('returns the additional skip modifiers', function () {
            const suiteNames = getSuiteNames({
                additionalCustomNames: [
                    { name: 'myCustomDescribe', type: 'suite', interfaces: ['BDD'] },
                    { name: 'myCustomSuite', type: 'suite', interfaces: ['TDD'] }
                ],
                modifiers: ['skip'],
                modifiersOnly: true
            });

            assert.deepStrictEqual(suiteNames, [
                'describe.skip',
                'context.skip',
                'suite.skip',
                'myCustomDescribe.skip',
                'myCustomSuite.skip',
                'xdescribe',
                'xcontext',
                'xmyCustomDescribe'
            ]);
        });
    });
});
