import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const noTopLevelHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow top-level hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-top-level-hooks.md'
        },
        messages: {
            unexpectedTopLevelHook: 'Unexpected use of Mocha `{{name}}` hook outside of a test suite'
        },
        schema: []
    },
    create(context) {
        let testSuites = 0;

        return createMochaVisitors(context, {
            hook(visitorContext) {
                if (testSuites === 0) {
                    const { node } = visitorContext;

                    context.report({
                        node,
                        messageId: 'unexpectedTopLevelHook',
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
