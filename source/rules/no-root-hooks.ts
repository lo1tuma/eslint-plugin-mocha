import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';

export const noRootHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow root hooks',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-root-hooks.md'
        },
        schema: [],
        messages: {
            unexpectedRootHook: 'Unexpected use of Mocha `{{name}}` hook outside of a test suite'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        let testSuites = 0;

        return createMochaVisitors(context, {
            hook(visitorContext) {
                if (testSuites === 0) {
                    const { node } = visitorContext;

                    context.report({
                        node,
                        messageId: 'unexpectedRootHook',
                        data: { name: visitorContext.name }
                    });
                }
            },

            suite() {
                testSuites += 1;
            },

            'suite:exit'() {
                testSuites -= 1;
            }
        });
    }
};
