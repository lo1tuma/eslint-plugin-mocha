'use strict';

var BEFORE_OR_AFTER = [ 'before', 'after' ],
    CONTEXT_OR_DESCRIBE = [ 'context', 'describe', 'xcontext', 'xdescribe' ];

function isNodeBeforeOrAfterCall(node) {
  var methodName, callee = node.callee;

  if (callee.type === 'MemberExpression') {
    // This is foo.before(), not before()
    return false;
  }

  methodName = callee.name;

  return BEFORE_OR_AFTER.indexOf(methodName) !== -1;
}

// eslint-disable-next-line complexity, max-statements
function isInContextOrDescribe(node) {
  // Recurse up the tree, looking for a CallExpression with a callee of
  // `context` or `describe`.

  if (!node) {
    // We've reached the top of the tree and didn't find what we were looking
    // for.
    return false;
  }

  if (node.type === 'CallExpression') {
    if (node.callee.type === 'MemberExpression') {
      if (CONTEXT_OR_DESCRIBE.indexOf(node.callee.property.name) !== -1) {
        return true;
      }

      if (
        node.callee.property.name === 'skip' &&
        CONTEXT_OR_DESCRIBE.indexOf(node.callee.object.name) !== -1
      ) {
        return true;
      }

      return isInContextOrDescribe(node.parent);
    }

    if (CONTEXT_OR_DESCRIBE.indexOf(node.callee.name) !== -1) {
      return true;
    }
  }

  return isInContextOrDescribe(node.parent);
}

module.exports = {
  meta: {
    docs: {},

    schema: []
  },

  create: function rule(context) {
    return {
      CallExpression: function Callexpression(node) {
        var methodName;

        if (!isNodeBeforeOrAfterCall(node)) {
          return;
        }

        if (!isInContextOrDescribe(node)) {
          return;
        }

        methodName = node.callee.name;
        context.report(
          node,
          'Use `' + methodName + 'Each` instead of `' + methodName + '` because `' + methodName
          + '` will run only once for all tests and we want setup and teardowns to happen once for each test'
        );
      }
    };
  }
};
