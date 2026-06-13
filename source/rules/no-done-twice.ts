import type { Rule } from 'eslint';
import { collectRepeatedCallbackHandlingNodes } from '../repeated-callback-handling-paths.js';
import { createTrackedCallbackVisitors, type TrackedCallbackFunction } from './callback-tracking.js';

function reportDoneTwice(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<TrackedCallbackFunction>
): void {
    const reportedNodes = collectRepeatedCallbackHandlingNodes({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    for (const node of reportedNodes) {
        context.report({
            node,
            messageId: 'unexpectedDoneTwice'
        });
    }
}

export const noDoneTwiceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow calling a Mocha callback more than once',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-done-twice.md'
        },
        schema: [],
        messages: {
            unexpectedDoneTwice: 'Do not call the Mocha callback more than once'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        return createTrackedCallbackVisitors(context, {
            ignorePending: false,
            includeInheritedCallbackBinding: false,
            onTrackedFunctionEnd(trackedFunction) {
                reportDoneTwice(context, trackedFunction);
            }
        });
    }
};
