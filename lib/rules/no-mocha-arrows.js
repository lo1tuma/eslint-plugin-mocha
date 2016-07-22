'use strict';

/**
 * @fileoverview Disallow arrow functions as arguments to Mocha globals
 * @author Paul Melnikow
 */

var R = require('ramda'),
    mochaFunctionNames = [
        'describe',
        'describe.skip',
        'xdescribe',
        'suite',
        'context',
        'xcontext',
        'specify',
        'xspecify',
        'it',
        'it.only',
        'xit',
        'test',
        'test.only',
        'specify',
        'specify.only',
        'before',
        'after',
        'beforeEach',
        'afterEach'
    ];

module.exports = function (context) {
    function getCalleeName(callee) {
        if (callee.type === 'MemberExpression') {
             return callee.object.name + '.' + callee.property.name;
        }

        return callee.name;
    }

    function isLikelyMochaGlobal(scope, name) {
        return !R.find(R.propEq('name', name), scope.variables);
    }

    return {
        CallExpression: function (node) {
            var name = getCalleeName(node.callee),
                fnArg;

            if (name && mochaFunctionNames.indexOf(name) > -1) {
                fnArg = node.arguments.slice(-1)[0];
                if (fnArg && fnArg.type === 'ArrowFunctionExpression') {
                    if (isLikelyMochaGlobal(context.getScope(), name)) {
                        context.report(node, 'Do not pass arrow functions to ' + name + '()');
                    }
                }
            }
        }
    };
};
