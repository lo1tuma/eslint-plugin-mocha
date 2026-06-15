import type { Rule } from 'eslint';
import { isRuleNode } from '../ast/rule-node.js';
import { isRecord } from '../record.js';

function readReportNode(descriptor: unknown): Rule.Node | undefined {
    if (!isRecord(descriptor)) {
        return undefined;
    }

    const node: unknown = Object.getOwnPropertyDescriptor(descriptor, 'node')?.value;

    return isRuleNode(node) ? node : undefined;
}

export function isMochaCallbackReport(
    mochaCallbacks: WeakSet<Rule.Node>,
    descriptor: unknown
): boolean {
    const node = readReportNode(descriptor);

    return node !== undefined && mochaCallbacks.has(node);
}
