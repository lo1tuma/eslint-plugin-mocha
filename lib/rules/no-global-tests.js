import { createMochaVisitors } from '../ast/mochaVisitors.js';

function isGlobalScope(scope) {
    return scope.type === 'global' || scope.type === 'module';
}

export const noGlobalTestsRule = {
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
