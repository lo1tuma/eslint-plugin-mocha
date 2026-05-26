import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction } from '../ast/node-types.js';
import { type TraversableNode, visitChildNodes } from '../ast/visit-child-nodes.js';

export function containsDirectAwait(
    sourceCode: Readonly<SourceCode>,
    node: AnyFunction['body'] | TraversableNode
): boolean {
    if (node.type === 'AwaitExpression') {
        return true;
    }

    if (isFunction(node)) {
        return false;
    }

    let hasDirectAwait = false;

    visitChildNodes(sourceCode, node, (childNode) => {
        if (!hasDirectAwait && containsDirectAwait(sourceCode, childNode)) {
            hasDirectAwait = true;
        }
    });

    return hasDirectAwait;
}

function isAsyncFunction(node: Rule.Node): node is AnyFunction {
    return (node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
        node.async === true;
}

export function fixAsyncFunction(
    sourceCode: Readonly<SourceCode>,
    fixer: Rule.RuleFixer,
    fn: Readonly<AnyFunction>
): Readonly<Rule.Fix | null> {
    if (!containsDirectAwait(sourceCode, fn.body)) {
        // Remove the "async" token and all the whitespace before "function":
        const amountOfTokens = 2;
        const [asyncToken, functionToken] = sourceCode.getFirstTokens(fn, amountOfTokens);
        if (asyncToken === undefined || functionToken === undefined) {
            return null;
        }
        return fixer.removeRange([asyncToken.range[0], functionToken.range[0]]);
    }
    return null;
}

export const noAsyncSuiteRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow async functions passed to a suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-async-suite.md'
        },
        fixable: 'code',
        messages: {
            unexpectedAsyncSuite: 'Unexpected async function in {{name}}'
        },
        schema: []
    },
    create(context) {
        const { sourceCode } = context;

        return createMochaVisitors(context, {
            suiteCallback(visitorContext) {
                const { node } = visitorContext;

                if (isAsyncFunction(node)) {
                    context.report({
                        node,
                        messageId: 'unexpectedAsyncSuite',
                        data: { name: visitorContext.name },
                        fix(fixer) {
                            return fixAsyncFunction(sourceCode, fixer, node);
                        }
                    });
                }
            }
        });
    }
};
