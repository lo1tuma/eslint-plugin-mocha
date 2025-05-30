import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const noTopLevelHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow top-level hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-top-level-hooks.md'
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
                        message: `Unexpected use of Mocha \`${visitorContext.name}\` hook outside of a test suite`
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
