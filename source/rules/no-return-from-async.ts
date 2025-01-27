import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction, type ReturnStatement } from '../ast/node-types.js';
import { findReturnStatement, isReturnOfUndefined } from '../ast/return-statement.js';

function reportIfShortArrowFunction(context: Readonly<Rule.RuleContext>, node: Readonly<AnyFunction>): boolean {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with an async function'
        });
        return true;
    }
    return false;
}

export const noReturnFromAsyncRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow returning from an async test or hook',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-return-from-async.md'
        },
        schema: []
    },
    create(context) {
        function isAllowedReturnStatement(node: Readonly<ReturnStatement>): boolean {
            const { argument } = node;

            return (isReturnOfUndefined(node) || argument?.type === 'Literal');
        }

        function reportIfFunctionWithBlock(node: Readonly<AnyFunction>): void {
            if (node.body.type !== 'BlockStatement') {
                return;
            }

            const returnStatement = findReturnStatement(node.body.body);

            if (returnStatement !== undefined && !isAllowedReturnStatement(returnStatement)) {
                context.report({
                    node: returnStatement,
                    message: 'Unexpected use of `return` in a test with an async function'
                });
            }
        }

        function check(node: Readonly<Rule.Node>): void {
            if (!isFunction(node)) {
                return;
            }
            if (node.async !== true) {
                return;
            }

            if (!reportIfShortArrowFunction(context, node)) {
                reportIfFunctionWithBlock(node);
            }
        }

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                check(visitorContext.node);
            }
        });
    }
};
