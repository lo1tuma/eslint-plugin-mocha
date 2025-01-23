import { createMochaVisitors } from '../ast/mochaVisitors.js';

export const noExclusiveTestsRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exclusive tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-exclusive-tests.md'
        },
        schema: []
    },
    create(context) {
        function checkPresenceOfExclusiveModifier(visitorContext) {
            if (visitorContext.modifier === 'exclusive') {
                context.report({
                    node: visitorContext.node.callee.property,
                    message: 'Unexpected exclusive mocha test.'
                });
            }
        }

        return createMochaVisitors(context, {
            suiteOrTestCase: checkPresenceOfExclusiveModifier
        });
    }
};
