import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const noNestedSuitesRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow suites to be nested within other suites',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-nested-suites.md'
        },
        messages: {
            nestedSuite: 'Unexpected suite nested within another suite.'
        },
        schema: []
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
