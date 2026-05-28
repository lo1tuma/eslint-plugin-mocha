import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isFunction } from '../ast/node-types.js';
import { hasCallbackParameter } from '../mocha/callback-parameter.js';

function checkNodeForAsyncAndDone(context: Readonly<Rule.RuleContext>, node: Readonly<Rule.Node>): void {
    if (!isFunction(node) || node.async !== true || !hasCallbackParameter(node)) {
        return;
    }

    context.report({
        node,
        messageId: 'unexpectedAsyncAndDone'
    });
}

export const noAsyncAndDoneRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow async functions that also use a Mocha callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-async-and-done.md'
        },
        messages: {
            unexpectedAsyncAndDone: 'Do not use an async function together with a Mocha callback parameter'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                checkNodeForAsyncAndDone(context, visitorContext.node);
            }
        });
    }
};
