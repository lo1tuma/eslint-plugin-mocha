'use strict';

var astUtil = require('../util/ast');

module.exports = function (context) {
    var testSuiteStack = [];

    return {
        CallExpression: function (node) {
            if (astUtil.isDescribe(node)) {
                testSuiteStack.push(node);
                return;
            }

            if (!astUtil.isHookIdentifier(node.callee)) {
              return;
            }

            if (testSuiteStack.length === 0) {
                context.report({
                    node: node.callee,
                    message: 'Unexpected use of Mocha `' + node.callee.name + '` hook outside of a test suite'
                });
            }
        },

        'CallExpression:exit': function (node) {
            if (testSuiteStack[testSuiteStack.length - 1] === node) {
                testSuiteStack.pop();
            }
        }
    };
};
