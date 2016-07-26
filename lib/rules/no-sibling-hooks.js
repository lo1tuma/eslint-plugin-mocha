'use strict';

module.exports = function (context) {
    var hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ],
        isUsed = [];

    function newDescribeLayer(describeNode) {
        return {
            describeNode: describeNode,
            before: false,
            after: false,
            beforeEach: false,
            afterEach: false
        };
    }

    return {
        Program: function (node) {
            isUsed.push(newDescribeLayer(node));
        },

        CallExpression: function (node) { // eslint-disable-line complexity, max-statements
            var name;
            if (node.callee.type !== 'Identifier') {
              return;
            }

            name = node.callee.name;
            if (name === 'describe') {
                isUsed.push(newDescribeLayer(node));
                return;
            }

            if (hooks.indexOf(name) === -1) {
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
