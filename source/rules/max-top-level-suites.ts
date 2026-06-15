import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { getRuleOption, type InferSchemaOption } from '../rule-options.ts';

const defaultSuiteLimit = 1;
const optionSchema = {
    type: 'object',
    properties: {
        limit: {
            type: 'integer'
        }
    },
    additionalProperties: false
} as const;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { readonly limit: number; };
const defaultOption: ResolvedOption = { limit: defaultSuiteLimit };

function isTopLevelScope(scope: Readonly<Scope.Scope>): boolean {
    return scope.type === 'module' || scope.upper === null;
}

export const maxTopLevelSuitesRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce the number of top-level suites in a single file',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/max-top-level-suites.md'
        },
        schema: [ optionSchema ],
        defaultOptions: [ defaultOption ],
        messages: {
            tooManyTopLevelSuites: 'The number of top-level suites is more than {{limit}}.'
        },
        languages: [ 'js/js' ]
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
