import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction } from '../ast/node-types.js';
import {
    isLiteralOrUndefinedReturn,
    reportIfImplicitReturn,
    reportUnexpectedReturnInBlock
} from './mocha-return-rule.js';

export function reportIfFunctionWithBlock(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<AnyFunction>
): void {
    reportUnexpectedReturnInBlock(context, node, 'unexpectedReturnWithAsync', isLiteralOrUndefinedReturn);
}

export function checkNodeForReturnFromAsync(context: Readonly<Rule.RuleContext>, node: Readonly<Rule.Node>): void {
    if (!isFunction(node)) {
        return;
    }
    if (node.async !== true) {
        return;
    }

    if (!reportIfImplicitReturn(context, node, 'implicitReturnWithAsync')) {
        reportIfFunctionWithBlock(context, node);
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
