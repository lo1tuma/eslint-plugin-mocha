'use strict';

var R = require('ramda'),
    astUtils = require('../util/ast'),
    findReturnStatement = R.find(R.propEq('type', 'ReturnStatement'));

function hasParentMochaFunctionCall(functionExpression) {
    return astUtils.isTestCase(functionExpression.parent) || astUtils.isHookCall(functionExpression.parent);
}

function reportIfShortArrowFunction(context, node) {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with callback'
        });
        return true;
    }
    return false;
}

function isAllowedReturnStatement(node, doneName) {
    var argument = node.argument;
    if (argument === null || argument.type === 'Literal') {
        return true;
    }
    if (argument.type === 'Identifier' && argument.name === 'undefined') {
        return true;
    }
    return argument.type === 'CallExpression' &&
        argument.callee.type === 'Identifier' &&
        argument.callee.name === doneName;
}

function reportIfFunctionWithBlock(context, node, doneName) {
    var returnStatement = findReturnStatement(node.body.body);
    if (returnStatement && !isAllowedReturnStatement(returnStatement, doneName)) {
        context.report({
            node: returnStatement,
            message: 'Unexpected use of `return` in a test with callback'
        });
    }
}

module.exports = function (context) {
    function check(node) {
        if (node.params.length === 0 || !hasParentMochaFunctionCall(node)) {
            return;
        }

        if (!reportIfShortArrowFunction(context, node)) {
            reportIfFunctionWithBlock(context, node, node.params[0].name);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
