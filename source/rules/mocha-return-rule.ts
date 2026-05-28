import type { ReturnStatement } from '../ast/node-types.js';
import { isReturnOfUndefined } from '../ast/return-statement.js';

export function isLiteralOrUndefinedReturn(node: Readonly<ReturnStatement>): boolean {
    return isReturnOfUndefined(node) || node.argument?.type === 'Literal';
}
