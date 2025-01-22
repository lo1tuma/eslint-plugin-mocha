import { createMochaVisitors } from '../ast/mochaVisitors.js';

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
    }
    if (node.type && !isFunction(node)) {
        return Object.keys(node).some((key) => {
            if (Array.isArray(node[key])) {
                return node[key].some(containsDirectAwait);
            }
            if (key !== 'parent' && node[key] && typeof node[key] === 'object') {
                return containsDirectAwait(node[key]);
            }
            return false;
        });
    }
    return false;
}

function isAsyncFunction(node) {
    return node && (node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
        node.async;
}

function fixAsyncFunction(sourceCode, fixer, fn) {
    if (!containsDirectAwait(fn.body)) {
        // Remove the "async" token and all the whitespace before "function":
        const amountOfTokens = 2;
        const [asyncToken, functionToken] = sourceCode.getFirstTokens(fn, amountOfTokens);
        return fixer.removeRange([asyncToken.range[0], functionToken.range[0]]);
    }
    return undefined;
}

export const noAsyncDescribeRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow async functions passed to a suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-async-describe.md'
        },
        fixable: 'code',
        schema: []
    },
    create(context) {
        const sourceCode = context.getSourceCode();

        return createMochaVisitors(context, {
            suiteCallback(visitorContext) {
                if (isAsyncFunction(visitorContext.node)) {
                    context.report({
                        node: visitorContext.node,
                        message: `Unexpected async function in ${visitorContext.name}`,
                        fix(fixer) {
                            return fixAsyncFunction(sourceCode, fixer, visitorContext.node);
                        }
                    });
                }
            }
        });
    }
};
