import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

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
const defaultOption: ResolvedOption = { pattern: '' };

function objectOptions(options: Readonly<ResolvedOption>): Readonly<NormalizedOptions> {
    const { pattern: stringPattern, message } = options;
    const pattern = new RegExp(stringPattern, 'u');

    return { pattern, message: typeof message === 'string' ? message : undefined };
}

export const validSuiteTitleRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require suite descriptions to match a pre-configured regular expression',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/valid-suite-title.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            invalidSuiteTitle: 'Invalid "{{name}}" description found.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const options = getRuleOption<ResolvedOption>(context);
        const { pattern, message } = objectOptions(options);

        function hasValidSuiteDescription(mochaCallExpression: Readonly<CallExpression>): boolean {
            const args = mochaCallExpression.arguments;
            const descriptionArgument = args[0];
            if (descriptionArgument !== undefined) {
                const description = getStringIfConstant(
                    descriptionArgument,
                    context.sourceCode.getScope(mochaCallExpression)
                );

                if (description !== null) {
                    return pattern.test(description);
                }
            }

            return true;
        }

        function hasValidOrNoSuiteDescription(mochaCallExpression: Readonly<CallExpression>): boolean {
            const args = mochaCallExpression.arguments;
            const hasNoSuiteDescription = args.length === 0;

            return hasNoSuiteDescription || hasValidSuiteDescription(mochaCallExpression);
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const { node, name } = visitorContext;

                if (isCallExpression(node) && !hasValidOrNoSuiteDescription(node)) {
                    context.report(
                        message === undefined
                            ? { node, messageId: 'invalidSuiteTitle', data: { name } }
                            : { node, message }
                    );
                }
            }
        });
    }
};
