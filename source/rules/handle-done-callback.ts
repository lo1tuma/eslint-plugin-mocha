import type { Rule, Scope } from 'eslint';
import { hasUnhandledReturnPath } from '../done-callback-paths.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';
import { createTrackedCallbackVisitors, type TrackedCallbackFunction } from './callback-tracking.js';

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

export function findParamInScope(
    paramName: string,
    scope: Readonly<Scope.Scope>
): Readonly<Scope.Variable | undefined> {
    const variable = scope.set.get(paramName);

    return variable?.defs[0]?.type === 'Parameter' ? variable : undefined;
}

export function reportUnhandledDoneCallback(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<TrackedCallbackFunction>
): void {
    if (trackedFunction.callbackName === undefined || trackedFunction.callbackNode === undefined) {
        return;
    }

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
        node: trackedFunction.callbackNode,
        messageId: 'expectedCallback',
        data: { name: trackedFunction.callbackName }
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
