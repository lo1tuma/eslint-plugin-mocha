'use strict';

/**
 * @fileoverview Disallow multiple top-level suites in a single file
 * @author Alexander Afanasyev
 */

var defaultSuiteNames = [ 'describe', 'context', 'suite' ];

module.exports = function (context) {
    var stack = [],
        topLevelDescribes = [],
        suiteNames = context.options[0] ? context.options[0] : defaultSuiteNames;

    return {
        CallExpression: function (node) {
            var callee = node.callee;
            if (callee && callee.name && suiteNames.indexOf(callee.name) > -1) {
                stack.push(node);
            }
        },

        'CallExpression:exit': function (node) {
            var callee = node.callee;
            if (callee && callee.name && suiteNames.indexOf(callee.name) > -1) {
                if (stack.length === 1) {
                    topLevelDescribes.push(node);
                }

                stack.pop(node);
            }
        },

        'Program:exit': function () {
            if (topLevelDescribes.length > 1) {
                context.report({
                    node: topLevelDescribes[1],
                    message: 'Multiple top-level suites are not allowed.'
                });
            }
        }
    };
};
