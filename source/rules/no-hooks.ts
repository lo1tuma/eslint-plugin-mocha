import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

function ensureEndsWithParens(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    if (!value.endsWith('()')) {
        return `${value}()`;
    }

    return value;
}

export const noHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-hooks.md'
        },
        defaultOptions: [{ allow: [] }],
        messages: {
            unexpectedHook: 'Unexpected use of Mocha `{{name}}` hook'
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- schema validation and defaultOptions guarantee the option shape
        const [{ allow }] = context.options as [{ allow: string[]; }];
        const allowList = new Set(allow.map(ensureEndsWithParens));

        return createMochaVisitors(context, {
            hook(visitorContext) {
                const isHookAllowed = allowList.has(visitorContext.name);

                if (!isHookAllowed) {
                    context.report({
                        node: visitorContext.node,
                        messageId: 'unexpectedHook',
                        data: { name: visitorContext.name }
                    });
                }
            }
        });
    }
};
