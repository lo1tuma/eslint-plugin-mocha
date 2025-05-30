import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isRecord } from '../record.js';

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
        const config = isRecord(context.options[0]) ? context.options[0] : {};
        const allow = Array.isArray(config.allow) ? config.allow : [];
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
