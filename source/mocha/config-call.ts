import type { Rule } from 'eslint';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';

const suiteConfig = new Set(['timeout', 'slow', 'retries']);

function getPropertyName(
    property: { name: undefined; value: string; } | { readonly name: string; readonly value: undefined; }
): string {
    return property.name ?? property.value;
}

function isSuiteConfigExpression(node: Readonly<CallExpression['callee']>): boolean {
    if (node.type !== 'MemberExpression') {
        return false;
    }

    const usingThis = node.object.type === 'ThisExpression';

    if (usingThis) {
        return suiteConfig.has(
            getPropertyName(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok
                node.property as unknown as { name: string; value: undefined; } | { name: undefined; value: string; }
            )
        );
    }

    return false;
}

export function isSuiteConfigCall(node: Readonly<Rule.Node>): boolean {
    return isCallExpression(node) && isSuiteConfigExpression(node.callee);
}
