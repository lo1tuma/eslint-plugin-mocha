'use strict';

var R = require('ramda'),
    isDefined = R.complement(R.isNil),
    isCallExpression = R.both(isDefined, R.propEq('type', 'CallExpression')),
    describeAliases = [ 'describe', 'xdescribe', 'describe.only', 'describe.skip',
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
  return isCallExpression(node)
      && describeAliases.concat(additionalSuiteNames).indexOf(getNodeName(node.callee)) > -1;
}

function isHookIdentifier(node) {
  return node
      && node.type === 'Identifier'
      && hooks.indexOf(node.name) !== -1;
}

function isHookCall(node) {
    return isCallExpression(node) && isHookIdentifier(node.callee);
}

function isTestCase(node) {
    return isCallExpression(node) && testCaseNames.indexOf(getNodeName(node.callee)) > -1;
}

function findReferenceByName(scope, name) {
    var references = scope.references.filter(R.pathEq([ 'identifier', 'name' ], name));

    if (references.length === 1) {
        return references[0];
    }
    return null;
}

function isShadowed(scope, name) {
    var reference = findReferenceByName(scope, name);

    return reference && reference.resolved && reference.resolved.defs.length > 0;
}

function isCallToShadowedReference(node, scope) {
    var name;

    if (!isCallExpression(node)) {
        return false;
    }

    name = getNodeName(node.callee).split('.')[0];

    return isShadowed(scope, name);
}

function isMochaFunctionCall(node, scope) {
    if (isCallToShadowedReference(node, scope)) {
        return false;
    }

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
