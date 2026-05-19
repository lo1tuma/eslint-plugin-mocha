import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import type { CallExpression, MemberExpression } from '../ast/node-types.js';

export const noExclusiveTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exclusive tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-exclusive-tests.md'
        },
        messages: {
            unexpectedExclusiveTest: 'Unexpected exclusive mocha test.'
        },
        schema: []
    },
    create(context) {
        function checkPresenceOfExclusiveModifier(visitorContext: Readonly<VisitorContext>): void {
            if (visitorContext.modifier === 'exclusive') {
                context.report({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                    node: ((visitorContext.node as CallExpression).callee as MemberExpression).property,
                    messageId: 'unexpectedExclusiveTest'
                });
            }
        }

        return createMochaVisitors(context, {
            suiteOrTestCase: checkPresenceOfExclusiveModifier
        });
    }
};
