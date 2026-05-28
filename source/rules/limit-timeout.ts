import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import {
    getStaticNumericConfigValue,
    isDisabledTimeoutValue,
    visitMochaContextConfigCalls
} from '../mocha/config-call.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';
import {
    disallowDisabledModeOptionSchema,
    disallowModeOptionSchema,
    maximumNumericMochaConfigOptionSchema,
    rangeNumericMochaConfigOptionSchema
} from './numeric-mocha-config-option-schemas.js';

const optionSchema = {
    oneOf: [
        disallowModeOptionSchema,
        disallowDisabledModeOptionSchema,
        maximumNumericMochaConfigOptionSchema,
        rangeNumericMochaConfigOptionSchema
    ]
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
const defaultOption: Option = { mode: 'disallow' };
type TimeoutMessageId =
    | 'unexpectedDisabledTimeout'
    | 'unexpectedTimeout'
    | 'unexpectedTimeoutAboveMax'
    | 'unexpectedTimeoutOutsideRange';
type ReportMessageDetails = {
    readonly messageId: TimeoutMessageId;
    readonly data?: Record<string, string>;
};

function validateOption(option: Readonly<Option>): void {
    if (option.mode === 'range' && option.min > option.max) {
        throw new TypeError('`min` must be less than or equal to `max`.');
    }
}

function reportUnexpectedTimeout(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    descriptor: Readonly<ReportMessageDetails>
): void {
    context.report({
        ...descriptor,
        node
    });
}

function reportDisabledTimeout(context: Readonly<Rule.RuleContext>, node: Readonly<CallExpression>): void {
    reportUnexpectedTimeout(context, node, {
        messageId: 'unexpectedDisabledTimeout'
    });
}

function reportTimeoutAboveMax(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    maximumValue: number,
    timeoutValue: number
): void {
    reportUnexpectedTimeout(context, node, {
        messageId: 'unexpectedTimeoutAboveMax',
        data: {
            max: String(maximumValue),
            value: String(timeoutValue)
        }
    });
}

function reportTimeoutOutsideRange(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    timeoutValue: number
): void {
    reportUnexpectedTimeout(context, node, {
        messageId: 'unexpectedTimeoutOutsideRange',
        data: {
            max: String(option.max),
            min: String(option.min),
            value: String(timeoutValue)
        }
    });
}

function readStaticTimeoutValue(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>
): number | null {
    return getStaticNumericConfigValue(node, context.sourceCode);
}

function checkDisabledTimeoutCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    timeoutValue: number
): void {
    if (isDisabledTimeoutValue(timeoutValue)) {
        reportDisabledTimeout(context, node);
    }
}

function checkMaximumTimeoutCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    maximumValue: number,
    timeoutValue: number
): void {
    if (timeoutValue > maximumValue) {
        reportTimeoutAboveMax(context, node, maximumValue, timeoutValue);
    }
}

function checkTimeoutRangeCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Readonly<Extract<Option, { mode: 'range'; }>>,
    timeoutValue: number
): void {
    if (timeoutValue < option.min || timeoutValue > option.max) {
        reportTimeoutOutsideRange(context, node, option, timeoutValue);
    }
}

function checkConfiguredTimeoutCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    option: Exclude<Option, { mode: 'disallow'; }>,
    timeoutValue: number
): void {
    if (option.mode === 'disallowDisabled') {
        checkDisabledTimeoutCall(context, node, timeoutValue);
        return;
    }

    if (option.mode === 'max') {
        checkMaximumTimeoutCall(context, node, option.max, timeoutValue);
        return;
    }

    checkTimeoutRangeCall(context, node, option, timeoutValue);
}

export const limitTimeoutRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Enforce limits for Mocha timeouts',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/limit-timeout.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedTimeout: 'Unexpected use of Mocha timeout configuration.',
            unexpectedDisabledTimeout: 'Unexpected disabled Mocha timeout.',
            unexpectedTimeoutAboveMax: 'Unexpected Mocha timeout value {{value}}. Maximum allowed is {{max}}.',
            unexpectedTimeoutOutsideRange:
                'Unexpected Mocha timeout value {{value}}. Expected a value between {{min}} and {{max}}.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const option = getRuleOption<Option>(context);
        validateOption(option);

        function checkTimeoutCall(node: Readonly<CallExpression>): void {
            if (option.mode === 'disallow') {
                reportUnexpectedTimeout(context, node, {
                    messageId: 'unexpectedTimeout'
                });
                return;
            }

            const timeoutValue = readStaticTimeoutValue(context, node);

            if (timeoutValue === null) {
                return;
            }

            checkConfiguredTimeoutCall(context, node, option, timeoutValue);
        }

        return createMochaVisitors(context, {
            config(visitorContext) {
                const { node } = visitorContext;

                if (visitorContext.config === 'timeout' && isCallExpression(node)) {
                    checkTimeoutCall(node);
                }
            },

            anyTestEntityCallback(visitorContext) {
                visitMochaContextConfigCalls(context.sourceCode, visitorContext.node.body, 'timeout', checkTimeoutCall);
            }
        });
    }
};
