'use strict';

var astUtils = require('../util/ast');

module.exports = function (context) {
    var testFunctionNames = [
            'it',
            'it.only',
            'it.skip',
            'test',
            'test.only',
            'test.skip',
            'specify',
            'specify.only',
            'specify.skip'
        ];

    function isGlobalScope(scope) {
        return scope.type === 'global' || scope.type === 'module';
    }

    return {
        CallExpression: function (node) {
            var callee = node.callee,
                fnName = astUtils.getNodeName(callee),
                scope = context.getScope();

            if (testFunctionNames.indexOf(fnName) !== -1 && isGlobalScope(scope)) {
                context.report(callee, 'Unexpected global mocha test.');
            }
        }
    };
};
