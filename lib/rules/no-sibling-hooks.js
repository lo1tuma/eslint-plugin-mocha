'use strict';

var astUtil = require('../util/ast');

function newDescribeLayer(describeNode) {
    return {
        describeNode: describeNode,
        before: false,
        after: false,
        beforeEach: false,
        afterEach: false
    };
}

module.exports = function (context) {
    var isUsed = [];

    return {
        Program: function (node) {
            isUsed.push(newDescribeLayer(node));
        },

        CallExpression: function (node) {
            var name = node.callee && node.callee.name;
            if (astUtil.isDescribe(node)) {
              isUsed.push(newDescribeLayer(node));
              return;
            }

            if (!astUtil.isHookIdentifier(node.callee)) {
              return;
            }

            if (isUsed[isUsed.length - 1][name]) {
                context.report({
                    node: node.callee,
                    message: 'Unexpected use of duplicate Mocha `' + name + '` hook'
                });
            }

            isUsed[isUsed.length - 1][name] = true;
        },

        'CallExpression:exit': function (node) {
            if (isUsed[isUsed.length - 1].describeNode === node) {
              isUsed.pop();
            }
        }
    };
};
