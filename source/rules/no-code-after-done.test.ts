import { RuleTester } from 'eslint';
import { noCodeAfterDoneRule } from './no-code-after-done.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not execute code after calling the Mocha callback';

ruleTester.run('no-code-after-done', noCodeAfterDoneRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { return done(); });',
        'it("title", function(done) { const foo = done; foo(); });',
        'it("title", function(finish) { finish(); });',
        'it("title", function(done) { handler(function () { done(); return; }); });',
        'it("title", function(done) { const foo = done; setTimeout(foo, 0); });',
        'it("title", async function() { await work(); });',
        'it("title", function() { work(); });',
        'notMocha("title", function(done) { done(); expect(true).to.be.false; });'
    ],

    invalid: [
        {
            code: 'it("title", function(done) { done(); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { const foo = done; foo(); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { const foo = done; setTimeout(foo, 0); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { handler(function () { done(); expect(true).to.be.true; }); });',
            errors: [{ message }]
        },
        {
            code: 'beforeEach(function(done) { done(); setupNextStep(); });',
            errors: [{ message }]
        }
    ]
});
