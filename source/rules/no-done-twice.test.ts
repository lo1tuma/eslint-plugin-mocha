import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import { checkNodeForDoneTwice, noDoneTwiceRule } from './no-done-twice.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not call the Mocha callback more than once';

ruleTester.run('no-done-twice', noDoneTwiceRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { return done(); done(); });',
        'it("title", function(done) { handler(function () { return done(); done(); }); });',
        'it("title", function(done) { function later(done) { done(); done(); } });',
        'it("title", async function() { await work(); });',
        'notMocha("title", function(done) { done(); done(); });'
    ],

    invalid: [
        {
            code: 'it("title", function(done) { done(); done(); });',
            errors: [{ message, column: 38, line: 1 }]
        },
        {
            code: 'it("title", function(done) { if (failed) { done(error); } done(); });',
            errors: [{ message, column: 59, line: 1 }]
        },
        {
            code: 'it("title", function(done) { handler(function () { done(); done(); }); });',
            errors: [{ message, column: 60, line: 1 }]
        }
    ]
});

describe('no-done-twice helpers', function () {
    it('checkNodeForDoneTwice() ignores non-function nodes', function () {
        const reports: string[] = [];

        checkNodeForDoneTwice({
            report() {
                reports.push('reported');
            }
        } as unknown as Rule.RuleContext, { type: 'Identifier' } as Rule.Node);

        assert.deepStrictEqual(reports, []);
    });
});
