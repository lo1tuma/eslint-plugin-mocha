import type { Rule } from 'eslint';
import {
    type AnyFunction,
    getParentNode,
    isFunction,
    isMemberExpression,
    type Program
} from '../ast/node-types.ts';

export type DirectStatementScope = Readonly<AnyFunction['body'] | Program>;

function isNestedStatementBoundary(node: Rule.Node): boolean {
    return node.type.endsWith('Statement') || node.type.endsWith('Declaration') || isFunction(node);
}

export function isDirectStatementInScope(scopeNode: DirectStatementScope, node: Rule.Node): boolean {
    let current = node;

    while (!Object.is(getParentNode(current), scopeNode)) {
        current = getParentNode(current);

        if (
            isNestedStatementBoundary(current) &&
            !(current.type === 'ExpressionStatement' && Object.is(getParentNode(current), scopeNode))
        ) {
            return false;
        }
    }

    return current.type === 'ExpressionStatement';
}

export function getTopLevelMochaExpression(node: Rule.Node): Rule.Node {
    const parent = getParentNode(node);

    return isMemberExpression(parent) ? getTopLevelMochaExpression(parent) : node;
}
