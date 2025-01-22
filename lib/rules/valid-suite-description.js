import { getStringIfConstant } from '@eslint-community/eslint-utils';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

function objectOptions(options = {}) {
    const {
        pattern: stringPattern,
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

export const validSuiteDescriptionRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require suite descriptions to match a pre-configured regular expression',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/valid-suite-description.md'
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

        function hasValidSuiteDescription(mochaCallExpression) {
            const args = mochaCallExpression.arguments;
            const descriptionArgument = args[0];
            const description = getStringIfConstant(
                descriptionArgument,
                context.sourceCode.getScope(mochaCallExpression)
            );

            if (description) {
                return pattern.test(description);
            }

            return true;
        }

        function hasValidOrNoSuiteDescription(mochaCallExpression) {
            const args = mochaCallExpression.arguments;
            const hasNoSuiteDescription = args.length === 0;

            return hasNoSuiteDescription || hasValidSuiteDescription(mochaCallExpression);
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const { node } = visitorContext;

                if (!hasValidOrNoSuiteDescription(node)) {
                    const { callee } = node;
                    context.report({ node, message: message || `Invalid "${callee.name}()" description found.` });
                }
            }
        });
    }
};
