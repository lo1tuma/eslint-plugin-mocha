import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { type CallExpression, isCallExpression } from '../ast/node-types.ts';
import { getRuleOption, type InferSchemaOption } from '../rule-options.ts';

const ERROR_MESSAGE = 'Unexpected empty test description.';
const optionSchema = {
    type: 'object',
    properties: {
        message: {
            type: 'string'
        }
    },
    additionalProperties: false
} as const;

type Option = InferSchemaOption<typeof optionSchema>;
const defaultOption: Option = {};

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
            description: 'Disallow empty suite and test descriptions',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-empty-title.md'
        },
        schema: [ optionSchema ],
        defaultOptions: [ defaultOption ],
        messages: {
            emptyTitle: ERROR_MESSAGE
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        const { message: customMessage } = getRuleOption<Option>(context);

        function isNonEmptyDescription(mochaCallExpression: CallExpression): boolean {
            const description = mochaCallExpression.arguments[0];

            if (!isValidDescriptionArgumentNode(description)) {
                return false;
            }

            const text = getStringIfConstant(
                description,
                context.sourceCode.getScope(mochaCallExpression)
            );

            return text === null || text.trim().length > 0;
        }

        return createMochaVisitors(context, {
            suiteOrTestCase(visitorContext) {
                if (isCallExpression(visitorContext.node) && !isNonEmptyDescription(visitorContext.node)) {
                    context.report(
                        customMessage === undefined
                            ? { node: visitorContext.node, messageId: 'emptyTitle' }
                            : { node: visitorContext.node, message: customMessage }
                    );
                }
            }
        });
    }
};
