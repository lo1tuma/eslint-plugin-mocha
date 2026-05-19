import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
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
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { allow: string[]; };
const defaultOption: ResolvedOption = { allow: [] };

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
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-hooks.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedHook: 'Unexpected use of Mocha `{{name}}` hook'
        },
        schema: [optionSchema]
    },

    create(context) {
        const { allow } = getRuleOption<ResolvedOption>(context);
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
