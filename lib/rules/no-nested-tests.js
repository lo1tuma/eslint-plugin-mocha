'use strict';

const astUtils = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

module.exports = function noNestedTests(context) {
    const settings = context.settings;
    let testNestingLevel = 0;

    function report(callExpression, isTestCase) {
        const message = isTestCase ? 'Unexpected test nested within another test.' :
            'Unexpected suite nested within a test.';

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

    return {
        CallExpression(node) {
            const isTestCase = astUtils.isTestCase(node);
            const isDescribe = astUtils.isDescribe(node, additionalSuiteNames(settings));

            if (isNestedTest(isTestCase, isDescribe)) {
                report(node, isTestCase);
            }

            if (isTestCase) {
                testNestingLevel += 1;
            }
        },

        'CallExpression:exit'(node) {
            if (astUtils.isTestCase(node)) {
                testNestingLevel -= 1;
            }
        }
    };
};
