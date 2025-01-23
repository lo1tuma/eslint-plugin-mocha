import { getStringIfConstant } from '@eslint-community/eslint-utils';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

function objectOptions(options = {}) {
    const {
        pattern: stringPattern = '^should',
        message
    } = options;
    const pattern = new RegExp(stringPattern, 'u');

    return { pattern, message };
}

const patternSchema = {
    type: 'string'
};
const messageSchema = {
    type: 'string'
};

export const validTestDescriptionRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require test descriptions to match a pre-configured regular expression',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/valid-test-description.md'
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
        const options = context.options[0];
        const { pattern, message } = objectOptions(options);

        function hasValidTestDescription(mochaCallExpression) {
            const args = mochaCallExpression.arguments;
            const testDescriptionArgument = args[0];
            const description = getStringIfConstant(
                testDescriptionArgument,
                context.sourceCode.getScope(mochaCallExpression)
            );

            if (description) {
                return pattern.test(description);
            }

            return true;
        }

        function hasValidOrNoTestDescription(mochaCallExpression) {
            const args = mochaCallExpression.arguments;
            const hasNoTestDescription = args.length === 0;

            return hasNoTestDescription || hasValidTestDescription(mochaCallExpression);
        }

        return createMochaVisitors(context, {
            testCase(visitorContext) {
                const { node } = visitorContext;

                if (!hasValidOrNoTestDescription(node)) {
                    const { callee } = node;
                    context.report({ node, message: message || `Invalid "${callee.name}()" description found.` });
                }
            }
        });
    }
};
