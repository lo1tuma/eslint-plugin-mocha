import type { Rule } from 'eslint';
import { isRecord } from '../record.js';

export function isRuleNode(node: unknown): node is Rule.Node {
    return isRecord(node) && typeof node.type === 'string';
}

export function asRuleNode(node: unknown): Rule.Node {
    if (isRuleNode(node)) {
        return node;
    }

    throw new TypeError('Expected ESLint rule node.');
}
