import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isRecord } from '../record.js';

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
        const options = isRecord(context.options[0]) ? context.options[0] : {};
        const suiteLimit = typeof options.limit === 'number' ? options.limit : defaultSuiteLimit;

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
                        message: `The number of top-level suites is more than ${suiteLimit}.`
                    });
                }
            }
        });
    }
};
