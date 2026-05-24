import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import { checkNodeForCodeAfterDone, noCodeAfterDoneRule } from './no-code-after-done.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not execute code after calling the Mocha callback';

ruleTester.run('no-code-after-done', noCodeAfterDoneRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { return done(); });',
        'it("title", function(done) { done(); return; });',
        'it("title", function(done) { handler(function () { done(); return; }); });',
        'it("title", function(done) { function later(done) { done(); expect(true).to.be.false; } });',
        'it("title", async function() { await work(); });',
        'it("title", function() { work(); });',
        'notMocha("title", function(done) { done(); expect(true).to.be.false; });'
    ],

    invalid: [
        {
            code: 'it("title", function(done) { done(); expect(true).to.be.true; });',
            errors: [{ message, column: 38, line: 1 }]
        },
        {
            code: 'it("title", function(done) { handler(function () { done(); expect(true).to.be.true; }); });',
            errors: [{ message, column: 60, line: 1 }]
        },
        {
            code: 'beforeEach(function(done) { done(); setupNextStep(); });',
            errors: [{ message, column: 37, line: 1 }]
        }
    ]
});

describe('no-code-after-done helpers', function () {
    it('checkNodeForCodeAfterDone() ignores non-function nodes', function () {
        const reports: string[] = [];

        checkNodeForCodeAfterDone({
            report() {
                reports.push('reported');
            }
        } as unknown as Rule.RuleContext, { type: 'Identifier' } as Rule.Node);

        assert.deepStrictEqual(reports, []);
    });
});
