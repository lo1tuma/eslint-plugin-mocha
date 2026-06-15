import type { ReturnStatement } from '../ast/node-types.ts';
import { isReturnOfUndefined } from '../ast/return-statement.ts';

export function isLiteralOrUndefinedReturn(node: Readonly<ReturnStatement>): boolean {
    return isReturnOfUndefined(node) || node.argument?.type === 'Literal';
}
