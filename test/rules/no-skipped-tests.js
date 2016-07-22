'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    expectedErrorMessage = 'Unexpected skipped mocha test.';

ruleTester.run('no-skipped-tests', rules['no-skipped-tests'], {

    valid: [
        'describe()',
        'describeComponent()',
        'describeModel()',
        'describeModule()',
        'it()',
        'describe.only()',
        'describeComponent.only()',
        'describeModel.only()',
        'describeModule.only()',
        'it.only()',
        'suite()',
        'test()',
        'suite.only()',
        'test.only()',
        'context()',
        'context.only()',
        'var appliedOnly = describe.skip; appliedOnly.apply(describe)',
        'var calledOnly = it.skip; calledOnly.call(it)',
        'var dynamicOnly = "skip"; suite[dynamicOnly]()'
    ],

    invalid: [
        {
            code: 'describe.skip()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
            output: 'describe()'
        },
        {
            code: 'describe["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
            output: 'describe()'
        },
        {
            code: 'xdescribe()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'describe()'
        },
        {
            code: 'describeComponent.skip()',
            errors: [ { message: expectedErrorMessage, column: 19, line: 1 } ],
            output: 'describeComponent()'
        },
        {
            code: 'describeComponent["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 19, line: 1 } ],
            output: 'describeComponent()'
        },
        {
            code: 'xdescribeComponent()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'describeComponent()'
        },
        {
            code: 'describeModel.skip()',
            errors: [ { message: expectedErrorMessage, column: 15, line: 1 } ],
            output: 'describeModel()'
        },
        {
            code: 'describeModel["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 15, line: 1 } ],
            output: 'describeModel()'
        },
        {
            code: 'xdescribeModel()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'describeModel()'
        },
        {
            code: 'describeModule.skip()',
            errors: [ { message: expectedErrorMessage, column: 16, line: 1 } ],
            output: 'describeModule()'
        },
        {
            code: 'describeModule["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 16, line: 1 } ],
            output: 'describeModule()'
        },
        {
            code: 'xdescribeModule()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'describeModule()'
        },
        {
            code: 'it.skip()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
            output: 'it()'
        },
        {
            code: 'it["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
            output: 'it()'
        },
        {
            code: 'xit()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'it()'
        },
        {
            code: 'suite.skip()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
            output: 'suite()'
        },
        {
            code: 'suite["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
            output: 'suite()'
        },
        {
            code: 'test.skip()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
            output: 'test()'
        },
        {
            code: 'test["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
            output: 'test()'
        },
        {
            code: 'context.skip()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
            output: 'context()'
        },
        {
            code: 'context["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
            output: 'context()'
        },
        {
            code: 'xcontext()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'context()'
        },
        {
            code: 'specify.skip()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
            output: 'specify()'
        },
        {
            code: 'xspecify()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
            output: 'specify()'
        }

    ]

});
