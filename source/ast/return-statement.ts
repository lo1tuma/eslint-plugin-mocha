import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { type BlockStatement, isIdentifier, isReturnStatement, type ReturnStatement } from './node-types.js';

function isExplicitUndefined(
    node: Except<Rule.Node, 'parent'> | undefined
): boolean {
    return node !== undefined && isIdentifier(node) && node.name === 'undefined';
}

export function isReturnOfUndefined(node: Readonly<ReturnStatement>): boolean {
    const { argument } = node;
    const isImplicitUndefined = argument === null;

    return isImplicitUndefined || isExplicitUndefined(argument);
}

export function findReturnStatement(nodes: Readonly<BlockStatement['body']>): Readonly<ReturnStatement | undefined> {
    return nodes.find(isReturnStatement);
}
