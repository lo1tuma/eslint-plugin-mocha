'use strict';

const { expect } = require('chai');
const { getTestCaseNames, getSuiteNames } = require('../../lib/util/names');

describe('mocha names', () => {
    describe('test case names', () => {
        it('returns the list of basic test case names when no options are provided', () => {
            const testCaseNames = getTestCaseNames();

            expect(testCaseNames).to.deep.equal([
                'it',
                'test',
                'specify'
            ]);
        });

        it('returns an empty list when no modifiers and no base names are wanted', () => {
            const testCaseNames = getTestCaseNames({ baseNames: false });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('always returns a new array', () => {
            const testCaseNames1 = getTestCaseNames({ baseNames: false });
            const testCaseNames2 = getTestCaseNames({ baseNames: false });

            expect(testCaseNames1).to.deep.equal(testCaseNames2);
            expect(testCaseNames1).to.not.equal(testCaseNames2);
        });

        it('ignores invalid modifiers', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'foo' ], baseNames: false });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('returns the list of test case names with and without "skip" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip' ] });

            expect(testCaseNames).to.deep.equal([
                'it',
                'test',
                'specify',
                'it.skip',
                'test.skip',
                'specify.skip',
                'xit',
                'xspecify'
            ]);
        });

        it('returns the list of test case names only with "skip" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip' ], baseNames: false });

            expect(testCaseNames).to.deep.equal([
                'it.skip',
                'test.skip',
                'specify.skip',
                'xit',
                'xspecify'
            ]);
        });

        it('returns the list of test case names with and without "only" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'only' ] });

            expect(testCaseNames).to.deep.equal([
                'it',
                'test',
                'specify',
                'it.only',
                'test.only',
                'specify.only'
            ]);
        });

        it('returns the list of test case names only with "only" modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'only' ], baseNames: false });

            expect(testCaseNames).to.deep.equal([
                'it.only',
                'test.only',
                'specify.only'
            ]);
        });

        it('returns the list of all test case names', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip', 'only' ] });

            expect(testCaseNames).to.deep.equal([
                'it',
                'test',
                'specify',
                'it.skip',
                'test.skip',
                'specify.skip',
                'xit',
                'xspecify',
                'it.only',
                'test.only',
                'specify.only'
            ]);
        });

        it('returns the list of test case names only with modifiers applied', () => {
            const testCaseNames = getTestCaseNames({ modifiers: [ 'skip', 'only' ], baseNames: false });

            expect(testCaseNames).to.deep.equal([
                'it.skip',
                'test.skip',
                'specify.skip',
                'xit',
                'xspecify',
                'it.only',
                'test.only',
                'specify.only'
            ]);
        });

        it('returns the additional test case names', () => {
            const testCaseNames = getTestCaseNames({ additionalTestCaseNames: [ 'myCustomIt' ] });

            expect(testCaseNames).to.deep.equal([
                'it',
                'test',
                'specify',
                'myCustomIt'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', () => {
            const testCaseNames = getTestCaseNames({ additionalSuiteNames: [ 'myCustomIt' ], baseNames: false });

            expect(testCaseNames).to.deep.equal([]);
        });

        it('returns the additional skip modifiers', () => {
            const testCaseNames = getTestCaseNames({
                additionalTestCaseModifiers: { skip: [ 'myCustomIt.skip' ] },
                modifiers: [ 'skip' ],
                baseNames: false
            });

            expect(testCaseNames).to.deep.equal([
                'it.skip',
                'test.skip',
                'specify.skip',
                'xit',
                'xspecify',
                'myCustomIt.skip'
            ]);
        });

        it('doesn’t return additional skip modifiers when skip modifiers shouldn’t be included', () => {
            const testCaseNames = getTestCaseNames({
                additionalTestCaseModifiers: { skip: [ 'myCustomIt.skip' ] },
                modifiers: [ 'only' ],
                baseNames: false
            });

            expect(testCaseNames).to.deep.equal([
                'it.only',
                'test.only',
                'specify.only'
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
            const suiteNames = getSuiteNames({ baseNames: false });

            expect(suiteNames).to.deep.equal([]);
        });

        it('always returns a new array', () => {
            const suiteNames1 = getSuiteNames({ baseNames: false });
            const suiteNames2 = getSuiteNames({ baseNames: false });

            expect(suiteNames1).to.deep.equal(suiteNames2);
            expect(suiteNames1).to.not.equal(suiteNames2);
        });

        it('ignores invalid modifiers', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'foo' ], baseNames: false });

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
                'xcontext',
                'xsuite'
            ]);
        });

        it('returns the list of suite names only with "skip" modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip' ], baseNames: false });

            expect(suiteNames).to.deep.equal([
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext',
                'xsuite'
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
            const suiteNames = getSuiteNames({ modifiers: [ 'only' ], baseNames: false });

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
                'xsuite',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the list of suite names names only with modifiers applied', () => {
            const suiteNames = getSuiteNames({ modifiers: [ 'skip', 'only' ], baseNames: false });

            expect(suiteNames).to.deep.equal([
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext',
                'xsuite',
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });

        it('returns the additional suite names', () => {
            const suiteNames = getSuiteNames({ additionalSuiteNames: [ 'myCustomDescribe' ] });

            expect(suiteNames).to.deep.equal([
                'describe',
                'context',
                'suite',
                'myCustomDescribe'
            ]);
        });

        it('doesn’t return the additional suite names when base names shouldn’t be included', () => {
            const suiteNames = getSuiteNames({ additionalSuiteNames: [ 'myCustomDescribe' ], baseNames: false });

            expect(suiteNames).to.deep.equal([]);
        });

        it('returns the additional skip modifiers', () => {
            const suiteNames = getSuiteNames({
                additionalSuiteModifiers: { skip: [ 'myCustomDescribe.skip' ] },
                modifiers: [ 'skip' ],
                baseNames: false
            });

            expect(suiteNames).to.deep.equal([
                'describe.skip',
                'context.skip',
                'suite.skip',
                'xdescribe',
                'xcontext',
                'xsuite',
                'myCustomDescribe.skip'
            ]);
        });

        it('doesn’t return additional skip modifiers when skip modifiers shouldn’t be included', () => {
            const suiteNames = getSuiteNames({
                additionalSuiteModifiers: { skip: [ 'myCustomDescribe.skip' ] },
                modifiers: [ 'only' ],
                baseNames: false
            });

            expect(suiteNames).to.deep.equal([
                'describe.only',
                'context.only',
                'suite.only'
            ]);
        });
    });
});
