import type { Rule } from 'eslint';
import { hasUnhandledReturnPath } from '../done-callback-paths.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';
import { createTrackedCallbackVisitors, type DirectTrackedCallbackFunction } from './callback-tracking.js';

const optionSchema = {
    type: 'object',
    properties: {
        ignorePending: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { ignorePending: boolean; };
const defaultOption: ResolvedOption = { ignorePending: false };

function reportUnhandledDoneCallback(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<DirectTrackedCallbackFunction>
): void {
    const { callbackName, callbackNode } = trackedFunction;

    const hasUnhandledPath = hasUnhandledReturnPath({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    if (!hasUnhandledPath) {
        return;
    }

    context.report({
        node: callbackNode,
        messageId: 'expectedCallback',
        data: { name: callbackName }
    });
}

export const handleDoneCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Enforces handling of callbacks for async tests in every branch',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/handle-done-callback.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            expectedCallback: 'Expected "{{name}}" callback to be handled.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { ignorePending } = getRuleOption<ResolvedOption>(context);
        return createTrackedCallbackVisitors(context, {
            ignorePending,
            includeInheritedCallbackBinding: false,
            onTrackedFunctionEnd(trackedFunction) {
                reportUnhandledDoneCallback(context, trackedFunction);
            }
        });
    }
};
