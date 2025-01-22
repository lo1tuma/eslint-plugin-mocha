import { createMochaVisitors } from '../ast/mochaVisitors.js';

function ensureEndsWithParens(value) {
    if (!value.endsWith('()')) {
        return `${value}()`;
    }

    return value;
}

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
        const [config = {}] = context.options;
        const { allow = [] } = config;
        const allowList = new Set(allow.map(ensureEndsWithParens));

        return createMochaVisitors(context, {
            hook(visitorContext) {
                const isHookAllowed = allowList.has(visitorContext.name);

                if (!isHookAllowed) {
                    context.report({
                        node: visitorContext.node,
                        message: `Unexpected use of Mocha \`${visitorContext.name}\` hook`
                    });
                }
            }
        });
    }
};
