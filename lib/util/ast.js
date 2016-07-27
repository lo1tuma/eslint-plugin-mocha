/* eslint-env node*/

'use strict';

var describeAliases = [ 'describe', 'xdescribe', 'context', 'xcontext' ],
    hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ];

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

function isHookIdentifier(node) {
  return node
      && node.type === 'Identifier'
      && hooks.indexOf(node.name) !== -1;
}

module.exports = {
  isDescribe: isDescribe,
  isDescribeIdentifier: isDescribeIdentifier,
  isHookIdentifier: isHookIdentifier
};
