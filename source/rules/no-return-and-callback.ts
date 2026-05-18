import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction, type ReturnStatement } from '../ast/node-types.js';
import { findReturnStatement, isReturnOfUndefined } from '../ast/return-statement.js';

function reportIfShortArrowFunction(context: Readonly<Rule.RuleContext>, node: Readonly<AnyFunction>): boolean {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            messageId: 'implicitReturnWithCallback'
        });
        return true;
    }
    return false;
}

function isFunctionCallWithName(node: Except<Rule.Node, 'parent'> | null | undefined, name: string): boolean {
    return node !== undefined && node !== null && node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name;
}

export const noReturnAndCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow returning in a test or hook function that uses a callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-return-and-callback.md'
        },
        messages: {
            implicitReturnWithCallback: 'Confusing implicit return in a test with callback',
            unexpectedReturnWithCallback: 'Unexpected use of `return` in a test with callback'
        },
        schema: []
    },
    create(context) {
        function isAllowedReturnStatement(node: Readonly<ReturnStatement>, doneName: string): boolean {
            if (isReturnOfUndefined(node) || node.argument?.type === 'Literal') {
                return true;
            }

            return isFunctionCallWithName(node.argument, doneName);
        }

        function reportIfFunctionWithBlock(node: Readonly<AnyFunction>, doneName: string): void {
            if (node.body.type !== 'BlockStatement') {
                return;
            }
            const returnStatement = findReturnStatement(node.body.body);
            if (returnStatement !== undefined && !isAllowedReturnStatement(returnStatement, doneName)) {
                context.report({
                    node: returnStatement,
                    messageId: 'unexpectedReturnWithCallback'
                });
            }
        }

        function check(node: Readonly<Rule.Node>): void {
            if (!isFunction(node)) {
                return;
            }
            const [firstParam] = node.params;
            if (firstParam?.type !== 'Identifier') {
                return;
            }

            if (!reportIfShortArrowFunction(context, node)) {
                reportIfFunctionWithBlock(node, firstParam.name);
            }
        }

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                check(visitorContext.node);
            }
        });
    }
};
