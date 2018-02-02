'use strict';

var astUtils = require('../util/ast'),
    additionalSuiteNames = require('../util/settings').additionalSuiteNames;

module.exports = function noSetupInDescribe(context) {
    var nesting = [],
        settings = context.settings,
        FUNCTION = 1,
        DESCRIBE = 2,
        PURE = 3;

    function isPureN(node) {
        return astUtils.isHookIdentifier(node) || astUtils.isTestCase(node);
    }

    function reportCallExpression(callExpression) {
        var message = 'Unexpected function call in describe block.';

        context.report({
            message: message,
            node: callExpression.callee
        });
    }

    function reportMemberExpression(memberExpression) {
        var message = 'Unexpected dot operator in describe block.';

        context.report({
            message: message,
            node: memberExpression
        });
    }

    function isNestedInDescribeBlock() {
        return nesting.indexOf(DESCRIBE) > -1 &&
                nesting.indexOf(PURE) === -1 &&
                nesting.lastIndexOf(FUNCTION) < nesting.lastIndexOf(DESCRIBE);
    }

    return {
        CallExpression: function (node) {
            var isDescribe = astUtils.isDescribe(node, additionalSuiteNames(settings)),
                isPure;

            // don't process anything else if the first describe hasn't been processed
            if (!isDescribe && !nesting.length) {
                return;
            }

            isPure = isPureN(node);

            if (!isPure &&
                !isDescribe &&
                isNestedInDescribeBlock()) {
                reportCallExpression(node);
            }
            if (isDescribe) {
                nesting.push(DESCRIBE);
            }
            if (isPure) {
                nesting.push(PURE);
            }
        },

        'CallExpression:exit': function (node) {
            if (astUtils.isDescribe(node) || nesting.length && isPureN(node)) {
                nesting.pop();
            }
        },

        MemberExpression: function (node) {
            if (nesting.length &&
                isNestedInDescribeBlock()) {
                reportMemberExpression(node);
            }
        },

        FunctionDeclaration: function () {
            if (nesting.length) {
                nesting.push(FUNCTION);
            }
        },
        'FunctionDeclaration:exit': function () {
            if (nesting.length) {
                nesting.pop();
            }
        },

        ArrowFunctionExpression: function () {
            if (nesting.length) {
                nesting.push(FUNCTION);
            }
        },
        'ArrowFunctionExpression:exit': function () {
            if (nesting.length) {
                nesting.pop();
            }
        }
    };
};
