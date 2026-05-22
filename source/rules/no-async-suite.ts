import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction } from '../ast/node-types.js';

type TraversableNode = Except<Rule.Node, 'parent'>;
type ContainsDirectAwait = (node: AnyFunction['body'] | TraversableNode) => boolean;

function isNode(value: unknown): value is TraversableNode {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function getNodeProperty(node: TraversableNode, key: string): unknown {
    return Reflect.get(node, key);
}

function containsDirectAwaitInValue(
    containsAwait: ContainsDirectAwait,
    value: unknown
): boolean {
    return isNode(value) && containsAwait(value);
}

function containsDirectAwaitInValues(
    containsAwait: ContainsDirectAwait,
    values: readonly unknown[]
): boolean {
    for (const value of values) {
        if (containsDirectAwaitInValue(containsAwait, value)) {
            return true;
        }
    }

    return false;
}

function containsDirectAwaitInChildNodes(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    containsAwait: ContainsDirectAwait
): boolean {
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
        const value = getNodeProperty(node, key);

        if (Array.isArray(value)) {
            if (containsDirectAwaitInValues(containsAwait, value)) {
                return true;
            }
        } else if (containsDirectAwaitInValue(containsAwait, value)) {
            return true;
        }
    }

    return false;
}

export function containsDirectAwait(
    sourceCode: Readonly<SourceCode>,
    node: AnyFunction['body'] | TraversableNode
): boolean {
    if (node.type === 'AwaitExpression') {
        return true;
    }

    return !isFunction(node) && containsDirectAwaitInChildNodes(sourceCode, node, (childNode) => {
        return containsDirectAwait(sourceCode, childNode);
    });
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
