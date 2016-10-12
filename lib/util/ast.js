/* eslint-env node*/

'use strict';

var describeAliases = [ 'describe', 'xdescribe', 'describe.only', 'describe.skip',
                        'context', 'xcontext', 'context.only', 'context.skip',
                        'suite', 'xsuite', 'suite.only', 'suite.skip' ],
    hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ],
    testCaseNames = [ 'it', 'it.only', 'it.skip',
                      'test', 'test.only', 'test.skip',
                      'specify', 'specify.only', 'specify.skip' ];

function getNodeName(node) {
    if (node.type === 'MemberExpression') {
        return node.object.name + '.' + node.property.name;
    }
    return node.name;
}

function isDescribe(node) {
  return node
      && node.type === 'CallExpression'
      && describeAliases.indexOf(getNodeName(node.callee)) > -1;
}

function isHookIdentifier(node) {
  return node
      && node.type === 'Identifier'
      && hooks.indexOf(node.name) !== -1;
}

function isTestCase(node) {
    return node
        && node.type === 'CallExpression'
        && testCaseNames.indexOf(getNodeName(node.callee)) > -1;
}

module.exports = {
  isDescribe: isDescribe,
  isHookIdentifier: isHookIdentifier,
  isTestCase: isTestCase
};
