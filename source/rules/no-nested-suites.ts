import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';

export const noNestedSuitesRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow suites to be nested within other suites',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-nested-suites.md'
        },
        schema: [],
        messages: {
            nestedSuite: 'Unexpected suite nested within another suite.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        let suiteNesting = 0;

        return createMochaVisitors(context, {
            suite(visitorContext) {
                if (suiteNesting > 0) {
                    context.report({
                        messageId: 'nestedSuite',
                        node: visitorContext.node
                    });
                }

                suiteNesting += 1;
            },

            'suite:exit'() {
                suiteNesting -= 1;
            }
        });
    }
};
