import type { Rule } from 'eslint';
import type { AnyFunction, ReturnStatement } from '../ast/node-types.js';
import { findReturnStatement, isReturnOfUndefined } from '../ast/return-statement.js';

export function isLiteralOrUndefinedReturn(node: Readonly<ReturnStatement>): boolean {
    return isReturnOfUndefined(node) || node.argument?.type === 'Literal';
}

export function reportIfImplicitReturn(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<AnyFunction>,
    messageId: string
): boolean {
    if (node.body.type === 'BlockStatement') {
        return false;
    }

    context.report({
        node: node.body,
        messageId
    });

    return true;
}

export function reportUnexpectedReturnInBlock(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<AnyFunction>,
    messageId: string,
    isAllowedReturnStatement: (node: Readonly<ReturnStatement>) => boolean
): void {
    if (node.body.type !== 'BlockStatement') {
        return;
    }

    const returnStatement = findReturnStatement(node.body.body);

    if (returnStatement !== undefined && !isAllowedReturnStatement(returnStatement)) {
        context.report({
            node: returnStatement,
            messageId
        });
    }
}
