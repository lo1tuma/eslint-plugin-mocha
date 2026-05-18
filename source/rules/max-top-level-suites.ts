import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const defaultSuiteLimit = 1;
const optionSchema = {
    type: 'object',
    properties: {
        limit: {
            type: 'integer'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { limit: number; };
const defaultOption: ResolvedOption = { limit: defaultSuiteLimit };

function isTopLevelScope(scope: Readonly<Scope.Scope>): boolean {
    return scope.type === 'module' || scope.upper === null;
}

export const maxTopLevelSuitesRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce the number of top-level suites in a single file',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/max-top-level-suites.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            tooManyTopLevelSuites: 'The number of top-level suites is more than {{limit}}.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const topLevelSuites: Rule.Node[] = [];
        const { limit: suiteLimit } = getRuleOption<ResolvedOption>(context);

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const scope = context.sourceCode.getScope(visitorContext.node);

                if (isTopLevelScope(scope)) {
                    topLevelSuites.push(visitorContext.node);
                }
            },

            'Program:exit'() {
                if (topLevelSuites.length > suiteLimit) {
                    context.report({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- ok in this case
                        node: topLevelSuites[suiteLimit]!,
                        messageId: 'tooManyTopLevelSuites',
                        data: { limit: String(suiteLimit) }
                    });
                }
            }
        });
    }
};
