import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isBlockStatement } from '../ast/node-types.js';

function containsDirectAwait(node: AnyFunction['body']): boolean {
    if (node.type === 'AwaitExpression') {
        return true;
    }
    if (isBlockStatement(node)) {
        return node.body.some((statement) => {
            return statement.type === 'ExpressionStatement' ? containsDirectAwait(statement.expression) : false;
        });
    }
    return false;
}

function isAsyncFunction(node: Rule.Node): node is AnyFunction {
    return (node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
        node.async === true;
}

function fixAsyncFunction(
    sourceCode: Readonly<SourceCode>,
    fixer: Rule.RuleFixer,
    fn: Readonly<AnyFunction>
): Readonly<Rule.Fix | null> {
    if (!containsDirectAwait(fn.body)) {
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
        docs: {
            description: 'Disallow async functions passed to a suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-async-suite.md'
        },
        fixable: 'code',
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
                        message: `Unexpected async function in ${visitorContext.name}`,
                        fix(fixer) {
                            return fixAsyncFunction(sourceCode, fixer, node);
                        }
                    });
                }
            }
        });
    }
};
