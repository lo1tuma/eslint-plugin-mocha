import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { isFunction } from './node-types.js';

export type TraversableNode = Except<Rule.Node, 'parent'>;

function getNodeProperty(node: TraversableNode, key: string): unknown {
    return Reflect.get(node, key);
}

function isNode(value: unknown): value is TraversableNode {
    return typeof value === 'object' && value !== null && 'type' in value;
}

export function visitChildNodes(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (childNode: TraversableNode) => void
): void {
    const visitorKeys = sourceCode.visitorKeys[node.type];

    if (visitorKeys === undefined) {
        return;
    }

    for (const key of visitorKeys) {
        const value = getNodeProperty(node, key);

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (isNode(item)) {
                    visitor(item);
                }
            });
        } else if (isNode(value)) {
            visitor(value);
        }
    }
}

export function visitWithoutNestedFunctions(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (childNode: TraversableNode) => void
): void {
    visitor(node);

    if (isFunction(node)) {
        return;
    }

    visitChildNodes(sourceCode, node, (childNode) => {
        visitWithoutNestedFunctions(sourceCode, childNode, visitor);
    });
}
