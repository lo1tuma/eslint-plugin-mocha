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
                        context.report({
                            node: node,
                            message: 'Do not pass arrow functions to ' + name + '()',
                            fix: function (fixer) {
                                var sourceCode = context.getSourceCode(),
                                    paramsLeftParen = sourceCode.getFirstToken(fnArg),
                                    paramsRightParen = sourceCode.getTokenBefore(sourceCode.getTokenBefore(fnArg.body)),
                                    paramsFullText =
                                        sourceCode.text.slice(paramsLeftParen.range[0], paramsRightParen.range[1]),
                                    bodyText;

                                if (fnArg.body.type === 'BlockStatement') {
                                    // When it((...) => { ... }),
                                    // simply replace '(...) => ' with 'function () '
                                    return fixer.replaceTextRange(
                                        [ fnArg.start, fnArg.body.start ],
                                        'function ' + paramsFullText + ' '
                                    );
                                }

                                bodyText = sourceCode.text.slice(fnArg.body.range[0], fnArg.body.range[1]);
                                return fixer.replaceTextRange(
                                    [ fnArg.start, fnArg.end ],
                                    'function ' + paramsFullText + ' { return ' + bodyText + '; }'
                                );
                            }
                        });
                    }
                }
            }
        }
    };
};
