import type { InferSchemaOption } from '../rule-options.ts';

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
} as const;

type AllowMochaCallOption = InferSchemaOption<typeof allowMochaCallOptionSchema>;
export type ResolvedAllowMochaCallOption = AllowMochaCallOption & { readonly allow: readonly string[]; };

export const defaultAllowMochaCallOption: ResolvedAllowMochaCallOption = { allow: [] };

export function normalizeMochaCallName(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.endsWith('()') ? value : `${value}()`;
}
