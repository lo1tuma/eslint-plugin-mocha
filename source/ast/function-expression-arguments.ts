import type { Rule } from 'eslint';

type CallExpressionNode = Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0];
type FunctionExpressionNode = Parameters<Exclude<Rule.RuleListener['FunctionExpression'], undefined>>[0];
type ArrowFunctionExpressionNode = Parameters<Exclude<Rule.RuleListener['ArrowFunctionExpression'], undefined>>[0];

export type AnyFunctionExpressionNode = ArrowFunctionExpressionNode | FunctionExpressionNode;

function isAnyFunctionExpression(
    node: Readonly<CallExpressionNode['arguments'][number]>
): node is AnyFunctionExpressionNode {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

export function getFunctionExpressionLastArgument(
    node: Readonly<CallExpressionNode>
): Readonly<AnyFunctionExpressionNode | undefined> {
    const lastArgument = node.arguments.at(-1);
    return lastArgument !== undefined && isAnyFunctionExpression(lastArgument)
        ? lastArgument
        : undefined;
}
