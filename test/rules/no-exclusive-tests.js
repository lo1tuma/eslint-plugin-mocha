'use strict';

var expect = require('chai').expect,
    noExlusiveTests = require('../../lib/rules/no-exclusive-tests');


function esLinter(ruleName, ruleFunction) {
    var runConfiguration = { rules: {} },
        esLint = require('eslint').linter;

    runConfiguration.rules[ruleName] = 1; // activate rule
    esLint.defineRule(ruleName, ruleFunction);

    return {
        verify: function (javascriptCodeSnippet) {
            return esLint.verify(javascriptCodeSnippet, runConfiguration);
        }
    };
}


describe('Test ESLint no-exclusive-tests rule', function () {

    var noExclusiveTestsRuleName = 'no-exclusive-tests',
        noExlusiveTestsLinter = esLinter(noExclusiveTestsRuleName, noExlusiveTests),
        ruleViolatingTestcases = [
            'describe.only()',
            'describe["only"]()',
            'it.only()',
            'it["only"]()'
        ],
        undetectedRuleViolationTestcases = [
            'var appliedOnly = describe.only; appliedOnly.apply(describe)',
            'var calledOnly = it.only; calledOnly.call(it)',
            'var computedOnly = "only"; describe[computedOnly]()'
        ];

    ruleViolatingTestcases.forEach(function (testcase) {

        it('should detect simple and static "' + testcase + '" calls', function () {
            var errors = noExlusiveTestsLinter.verify(testcase),
                firstError;

            expect(errors).to.exist;
            expect(errors).to.have.length(1);

            firstError = errors[0];
            expect(firstError.ruleId).to.equal(noExclusiveTestsRuleName);
        });

    });

    undetectedRuleViolationTestcases.forEach(function (testcase) {

        it('will fail to detect complex "' + testcase + '" calls', function () {
            var errors = noExlusiveTestsLinter.verify(testcase);

            expect(errors).to.be.empty;
        });

    });

});
