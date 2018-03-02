/* eslint-env node*/

'use strict';

var describeAliases = [ 'describe', 'xdescribe', 'describe.only', 'describe.skip',
                        'context', 'xcontext', 'context.only', 'context.skip',
                        'suite', 'xsuite', 'suite.only', 'suite.skip' ],
    hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ],
    testCaseNames = [ 'it', 'it.only', 'it.skip', 'xit',
                      'test', 'test.only', 'test.skip',
                      'specify', 'specify.only', 'specify.skip', 'xspecify' ];

function getPropertyName(property) {
    return property.name || property.value;
}

function getNodeName(node) {
    if (node.type === 'MemberExpression') {
        return getNodeName(node.object) + '.' + getPropertyName(node.property);
    }
    return node.name;
}

function isDescribe(node, additionalSuiteNames) {
  return node
      && node.type === 'CallExpression'
      && describeAliases.concat(additionalSuiteNames).indexOf(getNodeName(node.callee)) > -1;
}

function isHookIdentifier(node) {
  return node
      && node.type === 'Identifier'
      && hooks.indexOf(node.name) !== -1;
}

function isHookCall(node) {
    return node && node.type === 'CallExpression' && isHookIdentifier(node.callee);
}

function isTestCase(node) {
    return node
        && node.type === 'CallExpression'
        && testCaseNames.indexOf(getNodeName(node.callee)) > -1;
}

function isMochaFunctionCall(node) {
    return isTestCase(node) || isDescribe(node) || isHookCall(node);
}

module.exports = {
  isDescribe: isDescribe,
  isHookIdentifier: isHookIdentifier,
  isTestCase: isTestCase,
  getPropertyName: getPropertyName,
  getNodeName: getNodeName,
  isMochaFunctionCall: isMochaFunctionCall,
  isHookCall: isHookCall
};
