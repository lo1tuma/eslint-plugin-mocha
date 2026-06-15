import type { Rule } from 'eslint';
import { collectCallbackHandlingNodes } from './callback-handling-node-collector.ts';
import {
    type CallbackHandlingContext,
    getCodeAfterCallbackHandlingNode
} from './callback-handling-state.ts';

export function collectCodeAfterCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>
): readonly Rule.Node[] {
    return collectCallbackHandlingNodes(context, function (_context, pathState, operation) {
        return getCodeAfterCallbackHandlingNode(context.sourceCode, pathState, operation);
    });
}
