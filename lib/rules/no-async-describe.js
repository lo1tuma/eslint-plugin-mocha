'use strict';

/* eslint "complexity": [ "error", 5 ] */

/**
 * @fileoverview Disallow async functions as arguments to describe
 */

const astUtils = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

module.exports = function (context) {
    const sourceCode = context.getSourceCode();

    function isFunction(node) {
        return (
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration' ||
            node.type === 'ArrowFunctionExpression'
        );
    }

    function containsDirectAwait(node) {
        if (node.type === 'AwaitExpression') {
            return true;
        } else if (node.type && !isFunction(node)) {
            return Object.keys(node).some(function (key) {
                if (Array.isArray(node[key])) {
                    return node[key].some(containsDirectAwait);
                } else if (key !== 'parent' && node[key] && typeof node[key] === 'object') {
                    return containsDirectAwait(node[key]);
                }
                return false;
            });
        }
        return false;
    }

    function fixAsyncFunction(fixer, fn) {
        if (!containsDirectAwait(fn.body)) {
            return fixer.replaceTextRange(
                [ fn.start, fn.end ],
                sourceCode.text.slice(fn.range[0], fn.range[1]).replace(/^async /, '')
            );
        }
        return undefined;
    }

    function isAsyncFunction(node) {
        return node && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.async;
    }

    return {
        CallExpression(node) {
            const name = astUtils.getNodeName(node.callee);

            if (astUtils.isDescribe(node, additionalSuiteNames(context.settings))) {
                const fnArg = node.arguments.slice(-1)[0];
                if (isAsyncFunction(fnArg)) {
                    context.report({
                        node: fnArg,
                        message: `Do not pass an async function to ${name}()`,
                        fix(fixer) {
                            return fixAsyncFunction(fixer, fnArg);
                        }
                    });
                }
            }
        }
    };
};
