import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { type CallExpression, isCallExpression } from '../ast/node-types.ts';
import {
    getStaticNumericConfigValue,
    visitMochaContextConfigCalls
} from '../mocha/config-call.ts';
import { getRuleOption } from '../rule-options.ts';
import {
    disallowModeOptionSchema,
    maximumNumericMochaConfigOptionSchema,
    rangeNumericMochaConfigOptionSchema
} from './numeric-mocha-config-option-schemas.ts';

type MochaConfigName = Parameters<typeof visitMochaContextConfigCalls> extends [
    unknown,
    unknown,
    infer ConfigName,
    ...unknown[]
] ? ConfigName
    : never;

type NumericMochaConfigLimitOption =
    | { readonly mode: 'disallow'; }
    | {
        readonly mode: 'max';
        readonly max: number;
    }
    | {
        readonly mode: 'range';
        readonly min: number;
        readonly max: number;
    };

const numericMochaConfigLimitOptionSchema = {
    oneOf: [
        disallowModeOptionSchema,
        maximumNumericMochaConfigOptionSchema,
        rangeNumericMochaConfigOptionSchema
    ]
} as const;

const defaultNumericMochaConfigLimitOption: NumericMochaConfigLimitOption = { mode: 'disallow' };

type RuleDefinition<MessageId extends string> = {
    readonly configName: MochaConfigName;
    readonly description: string;
    readonly messageIds: {
        readonly aboveMax: MessageId;
        readonly disallow: MessageId;
        readonly outsideRange: MessageId;
    };
    readonly messages: Readonly<Record<MessageId, string>>;
    readonly name: string;
};

function reportMochaConfigCall(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    messageId: string,
    data?: Readonly<Record<string, string>>
): void {
    context.report({
        data,
        messageId,
        node
    });
}

function validateNumericMochaConfigLimitOption(option: Readonly<NumericMochaConfigLimitOption>): void {
    if (option.mode !== 'range') {
        return;
    }

    if (option.min > option.max) {
        throw new TypeError('`min` must be less than or equal to `max`.');
    }
}

type ConfiguredValueContext<MessageId extends string> = {
    readonly context: Readonly<Rule.RuleContext>;
    readonly messageIds: Readonly<RuleDefinition<MessageId>['messageIds']>;
    readonly node: Readonly<CallExpression>;
    readonly option: Exclude<NumericMochaConfigLimitOption, { readonly mode: 'disallow'; }>;
    readonly value: number;
};

function reportConfiguredValue<MessageId extends string>(
    configuredValueContext: Readonly<ConfiguredValueContext<MessageId>>
): void {
    const { context, messageIds, node, option, value } = configuredValueContext;

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
    node: Readonly<CallExpression>
): number | undefined {
    return getStaticNumericConfigValue(node, context.sourceCode) ?? undefined;
}

export function createSimpleNumericMochaConfigLimitRule<MessageId extends string>(
    ruleDefinition: Readonly<RuleDefinition<MessageId>>
): Readonly<Rule.RuleModule> {
    return {
        meta: {
            type: 'suggestion',
            languages: [ 'js/js' ],
            docs: {
                description: ruleDefinition.description,
                recommended: false,
                url: `https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/${ruleDefinition.name}.md`
            },
            defaultOptions: [ defaultNumericMochaConfigLimitOption ],
            messages: ruleDefinition.messages,
            schema: [ numericMochaConfigLimitOptionSchema ]
        },
        create(context) {
            const option = getRuleOption<NumericMochaConfigLimitOption>(context);
            validateNumericMochaConfigLimitOption(option);

            function checkConfigCall(node: Readonly<CallExpression>): void {
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

                    if (visitorContext.config === ruleDefinition.configName && isCallExpression(node)) {
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
