'use strict';

const { expect } = require('chai');
const { getTestCaseNames, getSuiteNames } = require('../../lib/util/names');

describe('mocha names', () => {
    describe('test case names', () => {
        it('returns the list of basic test case names when no options are provided', () => {
            const testCaseNames = getTestCaseNames();

            expect(testCaseNames).to.deep.equal([
                'it',
                'specify',
                'test'
            ]);
        });

        it('returns an empty list when no modifiers and no base names are wanted', () => {
            const testCaseNames = getTestCaseNames({ modifiersOnly: true, modifiers: [] });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('ignores invalid modifiers', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'foo' ], modifiersOnly: true });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('returns the list of test case names with and without "skip" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip' ] });

            expect(testCaseNames).to.deep.equal([
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

        it('returns the list of test case names only with "skip" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip' ], modifiersOnly: true });

            expect(testCaseNames).to.deep.equal([
                'it.skip',
                'specify.skip',
                'test.skip',
                'xit',
                'xspecify'
            ]);
        });

        it('returns the list of test case names with and without "only" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'only' ] });

            expect(testCaseNames).to.deep.equal([
                'it',
                'specify',
                'test',
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the list of test case names only with "only" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'only' ], modifiersOnly: true });

            expect(testCaseNames).to.deep.equal([
                'it.only',
                'specify.only',
                'test.only'
            ]);
        });

        it('returns the list of all test case names', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip', 'only' ] });

            expect(testCaseNames).to.deep.equal([
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

        it('returns the list of test case names only with modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip', 'only' ], modifiersOnly: true });

            expect(testCaseNames).to.deep.equal([
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

        it('returns the additional test case names', () => {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: [ 'BDD' ] }
                ]
            });

            expect(testCaseNames).to.deep.equal([
                'it',
                'specify',
                'test',
                'myCustomIt'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', () => {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: [ 'BDD' ] }
                ],
                modifiersOnly: true
            });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('returns the additional skip modifiers', () => {
            const testCaseNames = getTestCaseNames({
                additionalCustomNames: [
                    { name: 'myCustomIt', type: 'testCase', interfaces: [ 'BDD' ] },
                    { name: 'myCustomTest', type: 'testCase', interfaces: [ 'TDD' ] }

                ],
                modifiersOnly: true,
                modifiers: [ 'skip' ]
            });

            expect(testCaseNames).to.deep.equal([
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

    describe('suite names', () => {
        it('returns the list of basic suite names when no options are provided', () => {
            const suiteNames = getSuiteNames();

            expect(suiteNames).to.deep.equal([
                'describe',
                'context',
                'suite'
            ]);
        });

        it('returns an empty list when no modifiers and no base names are wanted', () => {
            const suiteNames = getSuiteNames({ modifiersOnly: true });

            expect(suiteNames).to.deep.equal([]);
        });

        it('ignores invalid modifiers', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'foo' ], modifiersOnly: true });

            expect(suiteNames).to.deep.equal([]);
        });

        it('returns the list of suite names with and without "skip" modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip' ] });

            expect(suiteNames).to.deep.equal([
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

        it('returns the list of suite names only with "skip" modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip' ], modifiersOnly: true });

            expect(suiteNames).to.deep.equal([
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext'
            ]);
        });

        it('returns the list of suite names with and without "only" modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'only' ] });

            expect(suiteNames).to.deep.equal([
                'describe',
                'context',
                'suite',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of suite names only with "only" modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'only' ], modifiersOnly: true });

            expect(suiteNames).to.deep.equal([
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of all suite names', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip', 'only' ] });

            expect(suiteNames).to.deep.equal([
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

        it('returns the list of suite names only with modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip', 'only' ], modifiersOnly: true });

            expect(suiteNames).to.deep.equal([
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

        it('returns the additional suite names', () => {
            const suiteNames = getSuiteNames({
                additionalCustomNames: [
                    { name: 'myCustomDescribe', type: 'suite', interfaces: [ 'BDD' ] }
                ]
            });

            expect(suiteNames).to.deep.equal([
                'describe',
                'context',
                'suite',
                'myCustomDescribe'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', () => {
            const suiteNames = getSuiteNames({ additionalSuiteNames: [ 'myCustomDescribe' ], modifiersOnly: true });

            expect(suiteNames).to.deep.equal([]);
        });

        it('returns the additional skip modifiers', () => {
            const suiteNames = getSuiteNames({
                additionalCustomNames: [
                    { name: 'myCustomDescribe', type: 'suite', interfaces: [ 'BDD' ] },
                    { name: 'myCustomSuite', type: 'suite', interfaces: [ 'TDD' ] }
                ],
                modifiers: [ 'skip' ],
                modifiersOnly: true
            });

            expect(suiteNames).to.deep.equal([
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
