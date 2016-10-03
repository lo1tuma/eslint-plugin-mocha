'use strict';

/**
 * @fileoverview Limit the number of top-level suites in a single file
 * @author Alexander Afanasyev
 */

var R = require('ramda'),
    astUtil = require('../util/ast'),
    defaultSuiteLimit = 1;

module.exports = function (context) {
    var stack = [],
        topLevelDescribes = [],
        options = context.options[0] || {},
        suiteLimit;

    if (R.isNil(options.limit)) {
        suiteLimit = defaultSuiteLimit;
    } else {
        suiteLimit = options.limit;
    }

    return {
        CallExpression: function (node) {
            if (astUtil.isDescribe(node)) {
                stack.push(node);
            }
        },

        'CallExpression:exit': function (node) {
            if (astUtil.isDescribe(node)) {
                if (stack.length === 1) {
                    topLevelDescribes.push(node);
                }

                stack.pop(node);
            }
        },

        'Program:exit': function () {
            if (topLevelDescribes.length > suiteLimit) {
                context.report({
                    node: topLevelDescribes[suiteLimit],
                    message: 'The number of top-level suites is more than ' + suiteLimit + '.'
                });
            }
        }
    };
};
