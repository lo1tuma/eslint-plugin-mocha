'use strict';

const astUtils = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

module.exports = function noNestedTests(context) {
    const settings = context.settings;
    let testNestingLevel = 0;
    let hookCallNestingLevel = 0;

    function report(callExpression, message) {
        context.report({
            message,
            node: callExpression.callee
        });
    }

    function isNestedTest(isTestCase, isDescribe) {
        const isNested = testNestingLevel > 0;
        const isTest = isTestCase || isDescribe;

        return isNested && isTest;
    }

    function isTestInHookCall(isTestCase, isHookCall) {
        const isNested = hookCallNestingLevel > 0;
        const isTest = isTestCase || isHookCall;

        return isNested && isTest;
    }

    return {
        CallExpression(node) {
            const isTestCase = astUtils.isTestCase(node);
            const isHookCall = astUtils.isHookCall(node);
            const isDescribe = astUtils.isDescribe(node, additionalSuiteNames(settings));

            if (isNestedTest(isTestCase, isDescribe)) {
                const message = isDescribe ?
                    'Unexpected suite nested within a test.' :
                    'Unexpected test nested within another test.';
                report(node, message);
            } else if (isTestInHookCall(isTestCase, isHookCall)) {
                report(node, 'Unexpected test nested within a test hook.');
            }

            if (isTestCase) {
                testNestingLevel += 1;
            } else if (isHookCall) {
                hookCallNestingLevel += 1;
            }
        },

        'CallExpression:exit'(node) {
            if (astUtils.isTestCase(node)) {
                testNestingLevel -= 1;
            } else if (astUtils.isHookCall(node)) {
                hookCallNestingLevel -= 1;
            }
        }
    };
};
