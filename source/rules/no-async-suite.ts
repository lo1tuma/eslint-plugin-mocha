import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { expectNodeRange } from '../ast/node-location.ts';
import { type AnyFunction, isFunction } from '../ast/node-types.ts';
import { type TraversableNode, visitChildNodes } from '../ast/visit-child-nodes.ts';

function containsDirectAwait(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<AnyFunction['body'] | TraversableNode>
): boolean {
    if (node.type === 'AwaitExpression') {
        return true;
    }

    if (isFunction(node)) {
        return false;
    }

    let hasDirectAwait = false;

    visitChildNodes(sourceCode, node, function (childNode) {
        if (!hasDirectAwait && containsDirectAwait(sourceCode, childNode)) {
            hasDirectAwait = true;
        }
    });

    return hasDirectAwait;
}

function isAsyncFunction(node: Readonly<Rule.Node>): node is AnyFunction {
    return (node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
        node.async === true;
}

function fixAsyncFunction(
    sourceCode: Readonly<SourceCode>,
    fixer: Rule.RuleFixer,
    fn: Readonly<AnyFunction>
): Readonly<Rule.Fix | null> {
    if (!containsDirectAwait(sourceCode, fn.body)) {
        const asyncPrefixLength = 'async '.length;
        const [ start ] = expectNodeRange(fn);

        return fixer.removeRange([ start, start + asyncPrefixLength ]);
    }
    return null;
}

export const noAsyncSuiteRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow async functions passed to a suite',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-async-suite.md'
        },
        fixable: 'code',
        schema: [],
        messages: {
            unexpectedAsyncSuite: 'Unexpected async function in {{name}}'
        },
        languages: [ 'js/js' ]
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
