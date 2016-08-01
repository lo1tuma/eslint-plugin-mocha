'use strict';

var describeAliases = [ 'describe', 'xdescribe', 'context', 'xcontext' ];

function newDescribeLayer(describeNode) {
    return {
        describeNode: describeNode,
        before: false,
        after: false,
        beforeEach: false,
        afterEach: false
    };
}

function isDescribeIdentifier(node) {
    return node.type === 'Identifier' && describeAliases.indexOf(node.name) !== -1;
}

function isDescribe(node) {
  return node
      && node.type === 'CallExpression'
      && (isDescribeIdentifier(node.callee)
          // eslint-disable-next-line no-extra-parens
          || (node.callee.type === 'MemberExpression' && isDescribeIdentifier(node.callee.object))
      );
}

module.exports = function (context) {
    var hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ],
        isUsed = [];

    return {
        Program: function (node) {
            isUsed.push(newDescribeLayer(node));
        },

        CallExpression: function (node) { // eslint-disable-line complexity
            var name = node.callee && node.callee.name;
            if (isDescribe(node)) {
              isUsed.push(newDescribeLayer(node));
              return;
            }

            if (node.callee.type !== 'Identifier' || hooks.indexOf(name) === -1) {
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
