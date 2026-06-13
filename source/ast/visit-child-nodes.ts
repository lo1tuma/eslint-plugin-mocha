import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { hasProperty, isRecord } from '../record.js';
import { isFunction } from './node-types.js';

export type TraversableNode = Except<Rule.Node, 'parent'>;

function getNodeProperty(node: TraversableNode, key: string): unknown {
    if (!isRecord(node)) {
        return undefined;
    }

    const record: Record<string, unknown> = node;

    return hasProperty(record, key) ? record[key] : undefined;
}

function isNode(value: unknown): value is TraversableNode {
    return isRecord(value) && hasProperty(value, 'type');
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
            value.forEach(function (item) {
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

    visitChildNodes(sourceCode, node, function (childNode) {
        visitWithoutNestedFunctions(sourceCode, childNode, visitor);
    });
}
