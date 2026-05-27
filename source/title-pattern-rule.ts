import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from './ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from './ast/node-types.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from './rule-options.js';

type NormalizedOptions = {
    pattern: RegExp;
    message: string | undefined;
};

const optionSchema = {
    type: 'object',
    properties: {
        pattern: {
            type: 'string'
        },
        message: {
            type: 'string'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { pattern: string; };

type TitlePatternRuleDefinition = {
    defaultPattern: string;
    description: string;
    documentationFile: string;
    messageId: string;
};

type CreateVisitors = (
    context: Readonly<Rule.RuleContext>,
    checkTitle: (visitorContext: Readonly<VisitorContext>) => void
) => Rule.RuleListener;

export function normalizeOptions(options: Readonly<ResolvedOption>): Readonly<NormalizedOptions> {
    const { pattern: stringPattern, message } = options;
    const pattern = new RegExp(stringPattern, 'u');

    return { pattern, message: typeof message === 'string' ? message : undefined };
}

export function hasValidOrNoDescription(
    context: Readonly<Rule.RuleContext>,
    mochaCallExpression: Readonly<CallExpression>,
    pattern: Readonly<RegExp>
): boolean {
    const descriptionArgument = mochaCallExpression.arguments[0];

    if (descriptionArgument === undefined) {
        return true;
    }

    const description = getStringIfConstant(
        descriptionArgument,
        context.sourceCode.getScope(mochaCallExpression)
    );

    return description === null || pattern.test(description);
}

function createTitlePatternRule(
    definition: Readonly<TitlePatternRuleDefinition>,
    createVisitors: CreateVisitors
): Readonly<Rule.RuleModule> {
    const defaultOptions: [ResolvedOption] = [{ pattern: definition.defaultPattern }];
    const messages = {
        [definition.messageId]: 'Invalid "{{name}}" description found.'
    };

    return {
        meta: {
            type: 'suggestion',
            languages: ['js/js'],
            docs: {
                description: definition.description,
                url: `https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/${definition.documentationFile}.md`
            },
            defaultOptions,
            messages,
            schema: [optionSchema]
        },
        create(context) {
            const options = getRuleOption<ResolvedOption>(context);
            const { pattern, message } = normalizeOptions(options);

            function checkTitle(visitorContext: Readonly<VisitorContext>): void {
                const { node, name } = visitorContext;

                if (!isCallExpression(node) || hasValidOrNoDescription(context, node, pattern)) {
                    return;
                }

                context.report(
                    message === undefined
                        ? { node, messageId: definition.messageId, data: { name } }
                        : { node, message }
                );
            }

            return createVisitors(context, checkTitle);
        }
    };
}

export function createSuiteTitlePatternRule(
    definition: Readonly<TitlePatternRuleDefinition>
): Readonly<Rule.RuleModule> {
    return createTitlePatternRule(definition, (context, checkTitle) => {
        return createMochaVisitors(context, { suite: checkTitle });
    });
}

export function createTestCaseTitlePatternRule(
    definition: Readonly<TitlePatternRuleDefinition>
): Readonly<Rule.RuleModule> {
    return createTitlePatternRule(definition, (context, checkTitle) => {
        return createMochaVisitors(context, { testCase: checkTitle });
    });
}
