import { getStringIfConstant } from '@eslint-community/eslint-utils';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

const ERROR_MESSAGE = 'Unexpected empty test description.';

function isLiteral(node) {
    return node && node.type === 'Literal';
}

function isStaticallyAnalyzableDescription(node, extractedText) {
    if (extractedText === null) {
        return isLiteral(node);
    }

    return true;
}

function isValidDescriptionArgumentNode(node) {
    if (!node) {
        return false;
    }

    return [
        'Literal',
        'TemplateLiteral',
        'TaggedTemplateExpression',
        'Identifier',
        'MemberExpression',
        'CallExpression',
        'LogicalExpression',
        'BinaryExpression',
        'ConditionalExpression',
        'UnaryExpression',
        'SpreadElement',
        'AwaitExpression',
        'YieldExpression',
        'NewExpression'
    ]
        .includes(node.type);
}

export const noEmptyTitleRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow empty test descriptions',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-empty-title.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    message: {
                        type: 'string'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const options = context.options[0] ?? {};
        const { message = ERROR_MESSAGE } = options;

        function isNonEmptyDescription(mochaCallExpression) {
            const description = mochaCallExpression.arguments[0];

            if (!isValidDescriptionArgumentNode(description)) {
                return false;
            }

            const text = getStringIfConstant(
                description,
                context.sourceCode.getScope(mochaCallExpression)
            );

            if (!isStaticallyAnalyzableDescription(description, text)) {
                return true;
            }

            return text && text.trim().length > 0;
        }

        return createMochaVisitors(context, {
            suiteOrTestCase(visitorContext) {
                if (!isNonEmptyDescription(visitorContext.node)) {
                    context.report({ node: visitorContext.node, message });
                }
            }
        });
    }
};
