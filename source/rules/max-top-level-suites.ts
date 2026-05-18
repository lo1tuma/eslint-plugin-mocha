import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

const defaultSuiteLimit = 1;

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
        defaultOptions: [{ limit: defaultSuiteLimit }],
        messages: {
            tooManyTopLevelSuites: 'The number of top-level suites is more than {{limit}}.'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const topLevelSuites: Rule.Node[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- schema validation and defaultOptions guarantee the option shape
        const [{ limit: suiteLimit }] = context.options as [{ limit: number; }];

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
