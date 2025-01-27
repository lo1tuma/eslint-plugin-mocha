import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import { isRecord } from '../record.js';

type Options = {
    pattern: RegExp;
    message: string | undefined;
};

function objectOptions(options: unknown): Readonly<Options> {
    const {
        pattern: stringPattern,
        message
    } = isRecord(options) ? options : {};
    const pattern = new RegExp(typeof stringPattern === 'string' ? stringPattern : '^should', 'u');

    return { pattern, message: typeof message === 'string' ? message : undefined };
}

const patternSchema = {
    type: 'string'
};
const messageSchema = {
    type: 'string'
};

export const validTestTitleRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require test descriptions to match a pre-configured regular expression',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/valid-test-title.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    pattern: patternSchema,
                    message: messageSchema
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const options = context.options[0] as unknown;
        const { pattern, message } = objectOptions(options);

        function hasValidTestDescription(mochaCallExpression: Readonly<CallExpression>): boolean {
            const args = mochaCallExpression.arguments;
            const testDescriptionArgument = args[0];

            if (testDescriptionArgument !== undefined) {
                const description = getStringIfConstant(
                    testDescriptionArgument,
                    context.sourceCode.getScope(mochaCallExpression)
                );

                if (description !== null) {
                    return pattern.test(description);
                }
            }

            return true;
        }

        function hasValidOrNoTestDescription(mochaCallExpression: Readonly<CallExpression>): boolean {
            const args = mochaCallExpression.arguments;
            const hasNoTestDescription = args.length === 0;

            return hasNoTestDescription || hasValidTestDescription(mochaCallExpression);
        }

        return createMochaVisitors(context, {
            testCase(visitorContext) {
                const { node, name } = visitorContext;

                if (isCallExpression(node) && !hasValidOrNoTestDescription(node)) {
                    context.report({ node, message: message ?? `Invalid "${name}" description found.` });
                }
            }
        });
    }
};
