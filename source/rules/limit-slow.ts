import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import { getStaticNumericConfigValue, visitMochaContextConfigCalls } from '../mocha/config-call.js';
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
type SlowMessageId =
    | 'unexpectedSlow'
    | 'unexpectedSlowAboveMax'
    | 'unexpectedSlowOutsideRange';
type ReportMessageDetails = {
    readonly messageId: SlowMessageId;
    readonly data?: Record<string, string>;
};

const defaultOption: Option = { mode: 'disallow' };

function validateOption(option: Readonly<Option>): void {
    if (option.mode === 'range' && option.min > option.max) {
        throw new TypeError('`min` must be less than or equal to `max`.');
    }
}

function reportUnexpectedSlow(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    descriptor: Readonly<ReportMessageDetails>
): void {
    context.report({
        ...descriptor,
        node: node.callee.type === 'MemberExpression' ? node.callee.property : node.callee
    });
}

function reportSlowAboveMax(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    maximumValue: number,
    slowValue: number
): void {
    reportUnexpectedSlow(context, node, {
        messageId: 'unexpectedSlowAboveMax',
        data: {
            max: String(maximumValue),
            value: String(slowValue)
        }
    });
}

function reportSlowOutsideRange(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    slowValue: number
): void {
    reportUnexpectedSlow(context, node, {
        messageId: 'unexpectedSlowOutsideRange',
        data: {
            max: String(option.max),
            min: String(option.min),
            value: String(slowValue)
        }
    });
}

function readStaticSlowValue(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>
): number | null {
    return getStaticNumericConfigValue(node, context.sourceCode);
}

function checkMaximumSlowCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    maximumValue: number,
    slowValue: number
): void {
    if (slowValue > maximumValue) {
        reportSlowAboveMax(context, node, maximumValue, slowValue);
    }
}

function checkSlowRangeCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    slowValue: number
): void {
    if (slowValue < option.min || slowValue > option.max) {
        reportSlowOutsideRange(context, node, option, slowValue);
    }
}

function checkConfiguredSlowCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Exclude<Option, { mode: 'disallow'; }>,
    slowValue: number
): void {
    if (option.mode === 'max') {
        checkMaximumSlowCall(context, node, option.max, slowValue);
        return;
    }

    checkSlowRangeCall(context, node, option, slowValue);
}

export const limitSlowRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Enforce limits for Mocha slow thresholds',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/limit-slow.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedSlow: 'Unexpected use of Mocha slow threshold configuration.',
            unexpectedSlowAboveMax: 'Unexpected Mocha slow value {{value}}. Maximum allowed is {{max}}.',
            unexpectedSlowOutsideRange:
                'Unexpected Mocha slow value {{value}}. Expected a value between {{min}} and {{max}}.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const option = getRuleOption<Option>(context);
        validateOption(option);

        function checkSlowCall(node: Readonly<CallExpression>): void {
            if (option.mode === 'disallow') {
                reportUnexpectedSlow(context, node, {
                    messageId: 'unexpectedSlow'
                });
                return;
            }

            const slowValue = readStaticSlowValue(context, node);

            if (slowValue === null) {
                return;
            }

            checkConfiguredSlowCall(context, node, option, slowValue);
        }

        return createMochaVisitors(context, {
            config(visitorContext) {
                if (visitorContext.config === 'slow' && isCallExpression(visitorContext.node)) {
                    checkSlowCall(visitorContext.node);
                }
            },

            anyTestEntityCallback(visitorContext) {
                visitMochaContextConfigCalls(context.sourceCode, visitorContext.node.body, 'slow', checkSlowCall);
            }
        });
    }
};
