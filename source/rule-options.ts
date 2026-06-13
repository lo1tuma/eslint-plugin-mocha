import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export type InferSchemaOption<TSchema extends JSONSchema> = FromSchema<TSchema>;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- callers provide the schema-derived option type
export type GetRuleOption = <TOption>(context: Readonly<Rule.RuleContext>) => TOption;

export const getRuleOption: GetRuleOption = function (context) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ESLint core types are not schema-aware
    return context.options[0] as never;
};
