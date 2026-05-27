import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import {
    getStaticNumericConfigValue,
    type MochaConfigCallExpression,
    visitMochaContextConfigCalls
} from '../mocha/config-call.js';
import { getRuleOption, type RuleSchema } from '../rule-options.js';

type MochaConfigName = Parameters<typeof visitMochaContextConfigCalls> extends [
    unknown,
    unknown,
    infer ConfigName,
    ...unknown[]
] ? ConfigName
    : never;

type NumericMochaConfigLimitOption =
    | { mode: 'disallow'; }
    | {
        mode: 'max';
        max: number;
    }
    | {
        mode: 'range';
        min: number;
        max: number;
    };

const numericMochaConfigLimitOptionSchema = {
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

const defaultNumericMochaConfigLimitOption: NumericMochaConfigLimitOption = { mode: 'disallow' };

type RuleDefinition<MessageId extends string> = {
    configName: MochaConfigName;
    description: string;
    messageIds: {
        aboveMax: MessageId;
        disallow: MessageId;
        outsideRange: MessageId;
    };
    messages: Record<MessageId, string>;
    name: string;
};

export function hasMemberCallee(node: Readonly<CallExpression>): node is MochaConfigCallExpression {
    return node.callee.type === 'MemberExpression';
}

function reportMochaConfigCall(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression,
    messageId: string,
    data?: Readonly<Record<string, string>>
): void {
    context.report({
        data,
        messageId,
        node: node.callee.property
    });
}

export function validateNumericMochaConfigLimitOption(option: Readonly<NumericMochaConfigLimitOption>): void {
    if (option.mode !== 'range') {
        return;
    }

    if (option.min > option.max) {
        throw new TypeError('`min` must be less than or equal to `max`.');
    }
}

type ConfiguredValueContext<MessageId extends string> = {
    context: Readonly<Rule.RuleContext>;
    messageIds: Readonly<RuleDefinition<MessageId>['messageIds']>;
    node: MochaConfigCallExpression;
    option: Exclude<NumericMochaConfigLimitOption, { mode: 'disallow'; }>;
    value: number;
};

function reportConfiguredValue<MessageId extends string>(
    configuredValueContext: Readonly<ConfiguredValueContext<MessageId>>
): void {
    const { context, node, messageIds, option, value } = configuredValueContext;

    if (option.mode === 'max') {
        if (value > option.max) {
            reportMochaConfigCall(context, node, messageIds.aboveMax, {
                max: String(option.max),
                value: String(value)
            });
        }

        return;
    }

    if (value < option.min || value > option.max) {
        reportMochaConfigCall(context, node, messageIds.outsideRange, {
            max: String(option.max),
            min: String(option.min),
            value: String(value)
        });
    }
}

function readConfiguredValue(
    context: Readonly<Rule.RuleContext>,
    node: MochaConfigCallExpression
): number | undefined {
    return getStaticNumericConfigValue(node, context.sourceCode) ?? undefined;
}

export function createSimpleNumericMochaConfigLimitRule<MessageId extends string>(
    ruleDefinition: Readonly<RuleDefinition<MessageId>>
): Readonly<Rule.RuleModule> {
    return {
        meta: {
            type: 'suggestion',
            languages: ['js/js'],
            docs: {
                description: ruleDefinition.description,
                url: `https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/${ruleDefinition.name}.md`
            },
            defaultOptions: [defaultNumericMochaConfigLimitOption],
            messages: ruleDefinition.messages,
            schema: [numericMochaConfigLimitOptionSchema]
        },
        create(context) {
            const option = getRuleOption<NumericMochaConfigLimitOption>(context);
            validateNumericMochaConfigLimitOption(option);

            function checkConfigCall(node: MochaConfigCallExpression): void {
                if (option.mode === 'disallow') {
                    reportMochaConfigCall(context, node, ruleDefinition.messageIds.disallow);
                    return;
                }

                const value = readConfiguredValue(context, node);

                if (value === undefined) {
                    return;
                }

                reportConfiguredValue({
                    context,
                    node,
                    messageIds: ruleDefinition.messageIds,
                    option,
                    value
                });
            }

            return createMochaVisitors(context, {
                config(visitorContext) {
                    const { node } = visitorContext;

                    if (
                        visitorContext.config === ruleDefinition.configName &&
                        isCallExpression(node) &&
                        hasMemberCallee(node)
                    ) {
                        checkConfigCall(node);
                    }
                },

                anyTestEntityCallback(visitorContext) {
                    visitMochaContextConfigCalls(
                        context.sourceCode,
                        visitorContext.node.body,
                        ruleDefinition.configName,
                        checkConfigCall
                    );
                }
            });
        }
    };
}
