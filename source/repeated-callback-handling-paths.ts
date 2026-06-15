import type { Rule } from 'eslint';
import { collectCallbackHandlingNodes } from './callback-handling-node-collector.ts';
import {
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    type CallbackPathState,
    getCodeAfterCallbackHandlingNode
} from './callback-handling-state.ts';

function getRepeatedCallbackHandlingNode(
    context: Readonly<CallbackHandlingContext>,
    pathState: Readonly<CallbackPathState>,
    operation: Readonly<CallbackHandlingOperation>
): Rule.Node | undefined {
    const repeatedNodeByOperationType = {
        bindingAssignment() {
            return undefined;
        },
        containerPropertyAssignment() {
            return undefined;
        },
        call() {
            if (!pathState.callbackHandled) {
                return undefined;
            }

            return getCodeAfterCallbackHandlingNode(context.sourceCode, pathState, operation) === undefined
                ? operation.node
                : undefined;
        }
    } as const;

    return repeatedNodeByOperationType[operation.type]();
}

export function collectRepeatedCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>
): readonly Rule.Node[] {
    return collectCallbackHandlingNodes(context, getRepeatedCallbackHandlingNode);
}
