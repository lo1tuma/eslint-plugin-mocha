import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { AnyFunction, ReturnStatement } from '../ast/node-types.js';
import { findReturnStatement } from '../ast/return-statement.js';
import { getIdentifierCallbackParameter } from '../mocha/callback-parameter.js';
import { isLiteralOrUndefinedReturn } from './mocha-return-rule.js';

function isFunctionCallWithName(node: Except<Rule.Node, 'parent'> | null | undefined, name: string): boolean {
    return node?.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name;
}

function isAllowedReturnStatement(node: Readonly<ReturnStatement>, callbackName: string): boolean {
    if (isLiteralOrUndefinedReturn(node)) {
        return true;
    }

    return isFunctionCallWithName(node.argument, callbackName);
}

function checkNodeForReturnAndDone(context: Readonly<Rule.RuleContext>, node: Readonly<AnyFunction>): void {
    const callbackParameter = getIdentifierCallbackParameter(node);

    if (callbackParameter === undefined) {
        return;
    }

    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            messageId: 'implicitReturnWithCallback'
        });
        return;
    }
    const returnStatement = findReturnStatement(node.body.body);

    if (returnStatement !== undefined && !isAllowedReturnStatement(returnStatement, callbackParameter.name)) {
        context.report({
            node: returnStatement,
            messageId: 'unexpectedReturnWithCallback'
        });
    }
}

export const noReturnAndDoneRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow returning in a test or hook function that uses a callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-return-and-done.md'
        },
        messages: {
            implicitReturnWithCallback: 'Confusing implicit return in a test with callback',
            unexpectedReturnWithCallback: 'Unexpected use of `return` in a test with callback'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                checkNodeForReturnAndDone(context, visitorContext.node);
            }
        });
    }
};
