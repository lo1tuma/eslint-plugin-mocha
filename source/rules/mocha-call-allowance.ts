import type { InferSchemaOption, RuleSchema } from '../rule-options.js';

export const allowMochaCallOptionSchema = {
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

type AllowMochaCallOption = InferSchemaOption<typeof allowMochaCallOptionSchema>;
export type ResolvedAllowMochaCallOption = AllowMochaCallOption & { allow: string[]; };

export const defaultAllowMochaCallOption: ResolvedAllowMochaCallOption = { allow: [] };

export function normalizeMochaCallName(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.endsWith('()') ? value : `${value}()`;
}
