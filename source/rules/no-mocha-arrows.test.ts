import { RuleTester } from 'eslint';
import { noMochaArrowsRule } from './no-mocha-arrows.js';

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2017, sourceType: 'script' }
});
const expectedErrorMessage = 'Do not pass arrow functions to it()';
const errors = [ { message: expectedErrorMessage, column: 1, line: 1 } ];

ruleTester.run('no-mocha-arrows', noMochaArrowsRule, {
    valid: [
        'it()',
        'it(function() { assert(something, false); })',
        'it("should be false", function() { assert(something, false); })',
        'it.only()',
        'it(function(done) { assert(something, false); done(); })',
        'it(function*() { assert(something, false) })',
        'it(async function () { assert(something, false) })',

        // In those examples, `it` is not a global.
        'function it () {}; it(() => { console.log("okay") })',
        'function it () {}; it.only(() => { console.log("okay") })',
        'function it () {}; it(() => {}); it(() => {});',
        'foo("", () => {}); const it = () => {}; it("", () => {});'
    ],

    invalid: [
        {
            code: 'it(() => { assert(something, false); })',
            output: 'it(function() { assert(something, false); })',
            errors
        },
        {
            code: 'it(() => assert(something, false))',
            output: 'it(function() { return assert(something, false); })',
            errors
        },
        {
            code: 'it(done => assert(something, false))',
            output: 'it(function(done) { return assert(something, false); })',
            errors
        },
        {
            code: 'it("should be false", () => { assert(something, false); })',
            output: 'it("should be false", function() { assert(something, false); })',
            errors
        },
        {
            code: 'it.only(() => { assert(something, false); })',
            output: 'it.only(function() { assert(something, false); })',
            errors: [ {
                message: 'Do not pass arrow functions to it.only()',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 45
            } ]
        },
        {
            code: 'it((done) => { assert(something, false); })',
            output: 'it(function(done) { assert(something, false); })',
            errors
        },
        {
            code: 'it(done => { assert(something, false); })',
            output: 'it(function(done) { assert(something, false); })',
            errors
        },
        {
            code: 'it("should be false", () => {\n assert(something, false);\n})',
            output: 'it("should be false", function() {\n assert(something, false);\n})',
            errors
        },
        {
            code: 'it(async () => { assert(something, false) })',
            output: 'it(async function() { assert(something, false) })',
            errors
        },
        {
            code: 'it(async () => assert(something, false))',
            output: 'it(async function() { return assert(something, false); })',
            errors
        },
        {
            code: 'it(async done => assert(something, false))',
            output: 'it(async function(done) { return assert(something, false); })',
            errors
        },
        {
            code: 'it(async (done) => assert(something, false))',
            output: 'it(async function(done) { return assert(something, false); })',
            errors
        },
        {
            code: 'it(async() => assert(something, false))',
            output: 'it(async function() { return assert(something, false); })',
            errors
        },
        {
            code: 'it(/*one*/async/*two*/(done)/*three*/=>/*four*/assert(something, false))',
            output: 'it(/*one*/async function/*two*/(done)/*three*//*four*/ { return assert(something, false); })',
            errors
        },
        {
            code: 'it(() => \n//hello\nassert(hello, false))',
            output: 'it(function() {\n//hello\nreturn assert(hello, false); })',
            errors
        },
        {
            code: 'it(() => \n//hello\t\nassert(hello, false))',
            output: 'it(function() {\n//hello\t\nreturn assert(hello, false); })',
            errors
        },
        {
            code: 'it(() =>  \n//hello\nassert(hello, false))',
            output: 'it(function() {\n//hello\nreturn assert(hello, false); })',
            errors
        },
        {
            code: 'it(() =>\n//hello  \nassert(hello, false))',
            output: 'it(function() {\n//hello  \nreturn assert(hello, false); })',
            errors
        },
        {
            code: 'const foo = () => {}; foo("", () => {}); it(() => { assert(something, false); })',
            output: 'const foo = () => {}; foo("", () => {}); it(function() { assert(something, false); })',
            errors: [ { message: expectedErrorMessage, column: 42, line: 1, endLine: 1, endColumn: 81 } ]
        }
    ]
});
