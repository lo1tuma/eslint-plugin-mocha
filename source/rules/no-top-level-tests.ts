import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

function isTopLevelScope(scope: Readonly<Scope.Scope>): boolean {
    return scope.type === 'global' || scope.type === 'module';
}

export const noTopLevelTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow top-level tests',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-top-level-tests.md'
        },
        schema: [],
        messages: {
            unexpectedTopLevelTest: 'Unexpected top-level mocha test.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        return createMochaVisitors(context, {
            testCase(visitorContext) {
                const scope = context.sourceCode.getScope(visitorContext.node);

                if (isTopLevelScope(scope)) {
                    context.report({ node: visitorContext.node, messageId: 'unexpectedTopLevelTest' });
                }
            }
        });
    }
};
