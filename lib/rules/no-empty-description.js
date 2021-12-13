'use strict';

const { getStringIfConstant } = require('eslint-utils');

const DEFAULT_TEST_NAMES = [ 'describe', 'context', 'suite', 'it', 'test', 'specify' ];
const ERROR_MESSAGE = 'Unexpected empty test description.';

function objectOptions(options = {}) {
    const {
        testNames = DEFAULT_TEST_NAMES,
        message
    } = options;

    return { testNames, message };
}

function isTemplateString(node) {
    return [ 'TaggedTemplateExpression', 'TemplateLiteral' ].includes(node && node.type);
}

function isIdentifier(node) {
    return node && node.type === 'Identifier';
}

function isStaticallyAnalyzableDescription(node, extractedText) {
    if (extractedText === null) {
        return !(isTemplateString(node) || isIdentifier(node));
    }

    return true;
}

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow empty test descriptions',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/master/docs/rules/no-empty-description.md'
        },
        messages: {
            error: ERROR_MESSAGE
        },
        schema: [
            {
                type: 'object',
                properties: {
                    testNames: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    message: {
                        type: 'string'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const options = context.options[0];

        const { testNames, message } = objectOptions(options);

        function isTest(node) {
            return node.callee && node.callee.name && testNames.includes(node.callee.name);
        }

        function isNonEmptyDescription(mochaCallExpression) {
            const description = mochaCallExpression.arguments[0];
            const text = getStringIfConstant(description, context.getScope());

            if (!isStaticallyAnalyzableDescription(description, text)) {
                return true;
            }

            return text && text.trim().length;
        }

        return {
            CallExpression(node) {
                if (isTest(node)) {
                    if (!isNonEmptyDescription(node)) {
                        context.report({
                            node,
                            message: message || ERROR_MESSAGE
                        });
                    }
                }
            }
        };
    }
};
