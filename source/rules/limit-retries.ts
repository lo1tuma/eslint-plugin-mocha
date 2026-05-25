import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import {
    getStaticNumericConfigValue,
    type MochaConfigCallExpression,
    visitMochaContextConfigCalls
} from '../mocha/config-call.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
    oneOf: [
        {
            type: 'object',
            properties: {
                mode: {
                    enum: ['disallow']
                }
            },
            required: ['mode'],
            additionalProperties: false
        },
        {
            type: 'object',
            properties: {
                mode: {
                    enum: ['max']
                },
                max: {
                    type: 'integer'
                }
            },
            required: ['mode', 'max'],
            additionalProperties: false
        },
        {
            type: 'object',
            properties: {
                mode: {
                    enum: ['range']
                },
                min: {
                    type: 'integer'
                },
                max: {
                    type: 'integer'
                }
            },
            required: ['mode', 'min', 'max'],
            additionalProperties: false
        }
    ]
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type RetryMessageId =
    | 'unexpectedRetries'
    | 'unexpectedRetriesAboveMax'
    | 'unexpectedRetriesOutsideRange';
type ReportMessageDetails = {
    readonly messageId: RetryMessageId;
    readonly data?: Record<string, string>;
};

function hasMemberCallee(node: Readonly<CallExpression>): node is MochaConfigCallExpression {
    return node.callee.type === 'MemberExpression';
}

const defaultOption: Option = { mode: 'disallow' };

function validateOption(option: Readonly<Option>): void {
    if (option.mode === 'range' && option.min > option.max) {
        throw new TypeError('`min` must be less than or equal to `max`.');
    }
}

function reportUnexpectedRetries(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    descriptor: Readonly<ReportMessageDetails>
): void {
    context.report({
        ...descriptor,
        node: node.callee.property
    });
}

function reportRetriesAboveMax(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    maximumValue: number,
    retryValue: number
): void {
    reportUnexpectedRetries(context, node, {
        messageId: 'unexpectedRetriesAboveMax',
        data: {
            max: String(maximumValue),
            value: String(retryValue)
        }
    });
}

function reportRetriesOutsideRange(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    retryValue: number
): void {
    reportUnexpectedRetries(context, node, {
        messageId: 'unexpectedRetriesOutsideRange',
        data: {
            max: String(option.max),
            min: String(option.min),
            value: String(retryValue)
        }
    });
}

function readStaticRetryValue(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression
): number | null {
    return getStaticNumericConfigValue(node, context.sourceCode);
}

function checkMaximumRetriesCall(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    maximumValue: number,
    retryValue: number
): void {
    if (retryValue > maximumValue) {
        reportRetriesAboveMax(context, node, maximumValue, retryValue);
    }
}

function checkRetriesRangeCall(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    retryValue: number
): void {
    if (retryValue < option.min || retryValue > option.max) {
        reportRetriesOutsideRange(context, node, option, retryValue);
    }
}

function checkConfiguredRetriesCall(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    option: Exclude<Option, { mode: 'disallow'; }>,
    retryValue: number
): void {
    if (option.mode === 'max') {
        checkMaximumRetriesCall(context, node, option.max, retryValue);
        return;
    }

    checkRetriesRangeCall(context, node, option, retryValue);
}

export const limitRetriesRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Enforce limits for Mocha retries',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/limit-retries.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedRetries: 'Unexpected use of Mocha retry configuration.',
            unexpectedRetriesAboveMax: 'Unexpected Mocha retry value {{value}}. Maximum allowed is {{max}}.',
            unexpectedRetriesOutsideRange:
                'Unexpected Mocha retry value {{value}}. Expected a value between {{min}} and {{max}}.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const option = getRuleOption<Option>(context);
        validateOption(option);

        function checkRetriesCall(node: MochaConfigCallExpression): void {
            if (option.mode === 'disallow') {
                reportUnexpectedRetries(context, node, {
                    messageId: 'unexpectedRetries'
                });
                return;
            }

            const retryValue = readStaticRetryValue(context, node);

            if (retryValue === null) {
                return;
            }

            checkConfiguredRetriesCall(context, node, option, retryValue);
        }

        return createMochaVisitors(context, {
            config(visitorContext) {
                const { node } = visitorContext;

                if (
                    visitorContext.config === 'retries' &&
                    isCallExpression(node) &&
                    hasMemberCallee(node)
                ) {
                    checkRetriesCall(node);
                }
            },

            anyTestEntityCallback(visitorContext) {
                visitMochaContextConfigCalls(context.sourceCode, visitorContext.node.body, 'retries', checkRetriesCall);
            }
        });
    }
};
