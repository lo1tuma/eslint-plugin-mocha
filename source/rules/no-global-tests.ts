import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

function isGlobalScope(scope: Readonly<Scope.Scope>): boolean {
    return scope.type === 'global' || scope.type === 'module';
}

export const noGlobalTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow global tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-global-tests.md'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            testCase(visitorContext) {
                const scope = context.sourceCode.getScope(visitorContext.node);

                if (isGlobalScope(scope)) {
                    context.report({ node: visitorContext.node, message: 'Unexpected global mocha test.' });
                }
            }
        });
    }
};
