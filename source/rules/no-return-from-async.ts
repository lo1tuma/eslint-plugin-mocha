import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { AnyFunction } from '../ast/node-types.js';
import { findReturnStatement } from '../ast/return-statement.js';
import { isLiteralOrUndefinedReturn } from './mocha-return-rule.js';

function checkNodeForReturnFromAsync(context: Readonly<Rule.RuleContext>, node: Readonly<AnyFunction>): void {
    if (node.async !== true) {
        return;
    }

    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            messageId: 'implicitReturnWithAsync'
        });
        return;
    }
    const returnStatement = findReturnStatement(node.body.body);

    if (returnStatement !== undefined && !isLiteralOrUndefinedReturn(returnStatement)) {
        context.report({
            node: returnStatement,
            messageId: 'unexpectedReturnWithAsync'
        });
    }
}

export const noReturnFromAsyncRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow returning from an async test or hook',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-return-from-async.md'
        },
        messages: {
            implicitReturnWithAsync: 'Confusing implicit return in a test with an async function',
            unexpectedReturnWithAsync: 'Unexpected use of `return` in a test with an async function'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                checkNodeForReturnFromAsync(context, visitorContext.node);
            }
        });
    }
};
