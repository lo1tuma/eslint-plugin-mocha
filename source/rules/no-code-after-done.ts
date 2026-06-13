import type { Rule } from 'eslint';
import { collectCodeAfterCallbackHandlingNodes } from '../callback-handling-paths.js';
import { createTrackedCallbackVisitors, type TrackedCallbackFunction } from './callback-tracking.js';

function reportCodeAfterDone(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<TrackedCallbackFunction>
): void {
    const reportedNodes = collectCodeAfterCallbackHandlingNodes({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    for (const node of reportedNodes) {
        context.report({
            node,
            messageId: 'unexpectedCodeAfterDone'
        });
    }
}

export const noCodeAfterDoneRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow executing code after calling a Mocha callback',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-code-after-done.md'
        },
        schema: [],
        messages: {
            unexpectedCodeAfterDone: 'Do not execute code after calling the Mocha callback'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        return createTrackedCallbackVisitors(context, {
            ignorePending: false,
            includeInheritedCallbackBinding: true,
            onTrackedFunctionEnd(trackedFunction) {
                reportCodeAfterDone(context, trackedFunction);
            }
        });
    }
};
