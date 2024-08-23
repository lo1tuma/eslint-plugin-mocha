import { createAstUtils } from '../util/ast.js';

export const noHooksRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-hooks.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allow: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                },
                additionalProperties: false
            }
        ]
    },

    create(context) {
        const astUtils = createAstUtils(context.settings);
        const [config = {}] = context.options;
        const { allow = [] } = config;

        return {
            CallExpression(node) {
                const isHookAllowed = allow.includes(node.callee.name);

                if (astUtils.isHookIdentifier(node.callee) && !isHookAllowed) {
                    context.report({
                        node: node.callee,
                        message: `Unexpected use of Mocha \`${node.callee.name}\` hook`
                    });
                }
            }
        };
    }
};
