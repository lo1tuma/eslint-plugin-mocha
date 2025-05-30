import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';
import { isRecord } from '../record.js';

const ERROR_MESSAGE = 'Unexpected empty test description.';

function isLiteral(node: Readonly<Rule.Node>): boolean {
    return node.type === 'Literal';
}

function isStaticallyAnalyzableDescription(node: Readonly<Rule.Node>, extractedText: string | null): boolean {
    if (extractedText === null) {
        return isLiteral(node);
    }

    return true;
}

function isValidDescriptionArgumentNode(node: Except<Rule.Node, 'parent'> | undefined): node is Rule.Node {
    if (node === undefined) {
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

export const noEmptyTitleRule: Readonly<Rule.RuleModule> = {
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
        const options = isRecord(context.options[0]) ? context.options[0] : {};
        const message = typeof options.message === 'string' ? options.message : ERROR_MESSAGE;

        function isNonEmptyDescription(mochaCallExpression: CallExpression): boolean {
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

            return text !== null && text.trim().length > 0;
        }

        return createMochaVisitors(context, {
            suiteOrTestCase(visitorContext) {
                if (isCallExpression(visitorContext.node) && !isNonEmptyDescription(visitorContext.node)) {
                    context.report({ node: visitorContext.node, message });
                }
            }
        });
    }
};
