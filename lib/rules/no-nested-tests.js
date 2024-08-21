/* eslint "complexity": [ "error", 5 ] -- we need to refactor this rule to reduce the complexity */

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-nested-tests.md'
        },
        schema: []
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        let testNestingLevel = 0;
        let hookCallNestingLevel = 0;
        const isTestCase = astUtils.buildIsTestCaseAnswerer();
        const isDescribe = astUtils.buildIsDescribeAnswerer();

        function report(callExpression, message) {
            context.report({
                message,
                node: callExpression.callee
            });
        }

        function isNestedTest(isTestCaseResult, isDescribeResult, nestingLevel) {
            const isNested = nestingLevel > 0;
            const isTest = isTestCaseResult || isDescribeResult;

            return isNested && isTest;
        }

        function checkForAndReportErrors(
            node,
            isTestCaseResult,
            isDescribeResult,
            isHookCall
        ) {
            if (isNestedTest(isTestCaseResult, isDescribeResult, testNestingLevel)) {
                const message = isDescribeResult
                    ? 'Unexpected suite nested within a test.'
                    : 'Unexpected test nested within another test.';
                report(node, message);
            } else if (
                isNestedTest(isTestCaseResult, isHookCall, hookCallNestingLevel)
            ) {
                const message = isHookCall
                    ? 'Unexpected test hook nested within a test hook.'
                    : 'Unexpected test nested within a test hook.';
                report(node, message);
            }
        }

        return {
            CallExpression(node) {
                const isTestCaseResult = isTestCase(node);
                const isHookCall = astUtils.isHookCall(node);
                const isDescribeResult = isDescribe(node);

                checkForAndReportErrors(
                    node,
                    isTestCaseResult,
                    isDescribeResult,
                    isHookCall
                );

                if (isTestCaseResult) {
                    testNestingLevel += 1;
                } else if (isHookCall) {
                    hookCallNestingLevel += 1;
                }
            },

            'CallExpression:exit'(node) {
                if (isTestCase(node)) {
                    testNestingLevel -= 1;
                } else if (astUtils.isHookCall(node)) {
                    hookCallNestingLevel -= 1;
                }
            }
        };
    }
};
