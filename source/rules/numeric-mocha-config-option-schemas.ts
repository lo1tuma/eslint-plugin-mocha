import type { RuleSchema } from '../rule-options.js';

export const disallowModeOptionSchema = {
    type: 'object',
    properties: {
        mode: {
            enum: ['disallow']
        }
    },
    required: ['mode'],
    additionalProperties: false
} as const satisfies RuleSchema;

export const disallowDisabledModeOptionSchema = {
    type: 'object',
    properties: {
        mode: {
            enum: ['disallowDisabled']
        }
    },
    required: ['mode'],
    additionalProperties: false
} as const satisfies RuleSchema;

export const maximumNumericMochaConfigOptionSchema = {
    type: 'object',
    properties: {
        mode: {
            enum: ['max']
        },
        max: {
            type: 'integer'
        }
    },
    required: ['mode', 'max'],
    additionalProperties: false
} as const satisfies RuleSchema;

export const rangeNumericMochaConfigOptionSchema = {
    type: 'object',
    properties: {
        mode: {
            enum: ['range']
        },
        min: {
            type: 'integer'
        },
        max: {
            type: 'integer'
        }
    },
    required: ['mode', 'min', 'max'],
    additionalProperties: false
} as const satisfies RuleSchema;
