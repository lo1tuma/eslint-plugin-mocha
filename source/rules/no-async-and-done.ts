import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction, isIdentifier } from '../ast/node-types.js';

function isTypeScriptThisParameter(param: AnyFunction['params'][number] | undefined): boolean {
    return param !== undefined && isIdentifier(param) && param.name === 'this';
}

function getFirstMeaningfulParameter(node: Readonly<AnyFunction>): AnyFunction['params'][number] | undefined {
    const [firstParam, secondParam] = node.params;
    return isTypeScriptThisParameter(firstParam) ? secondParam : firstParam;
}

function hasDoneCallbackParameter(node: Readonly<AnyFunction>): boolean {
    return getFirstMeaningfulParameter(node) !== undefined;
}

export function checkNodeForAsyncAndDone(context: Readonly<Rule.RuleContext>, node: Readonly<Rule.Node>): void {
    if (!isFunction(node) || node.async !== true || !hasDoneCallbackParameter(node)) {
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
