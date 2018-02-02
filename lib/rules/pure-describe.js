'use strict';

var astUtils = require('../util/ast'),
    additionalSuiteNames = require('../util/settings').additionalSuiteNames;

module.exports = function pureDescribe(context) {
    var nesting = [],
        settings = context.settings,
        FUNCTION = 'F',
        DESCRIBE = 'D',
        PURE = 'P';

    function isPureN(node) {
        return astUtils.isHookIdentifier(node) || astUtils.isTestCase(node);
    }

    function report(callExpression) {
        var message = 'Unexpected function call inside describe.';

        context.report({
            message: message,
            node: callExpression.callee
        });
    }

    return {
        CallExpression: function (node) {
            var isPure = isPureN(node),
                isDescribe = astUtils.isDescribe(node, additionalSuiteNames(settings));

            // not a pure CallExpression
            // in a describe CallExpression
            // not in a pure CallExpression
            // not inside a (arrow)function declaration
            if (!isPure &&
                !isDescribe &&
                nesting.indexOf(DESCRIBE) > -1 &&
                nesting.indexOf(PURE) === -1 &&
                nesting.lastIndexOf(FUNCTION) < nesting.lastIndexOf(DESCRIBE)) {
                report(node);
            }
            if (isDescribe) {
                nesting.push(DESCRIBE);
            }
            if (isPure) {
                nesting.push(PURE);
            }
        },

        'CallExpression:exit': function (node) {
            if (astUtils.isDescribe(node) || isPureN(node)) {
                nesting.pop();
            }
        },

        FunctionDeclaration: function () {
            nesting.push(FUNCTION);
        },
        'FunctionDeclaration:exit': function () {
            nesting.pop();
        },

        ArrowFunctionExpression: function () {
            nesting.push(FUNCTION);
        },
        'ArrowFunctionExpression:exit': function () {
            nesting.pop();
        }
    };
};
