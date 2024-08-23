import { createAstUtils } from '../util/ast.js';

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
        const astUtils = createAstUtils(context.settings);

        function isGlobalScope(scope) {
            return scope.type === 'global' || scope.type === 'module';
        }

        return {
            CallExpression(node) {
                const { callee } = node;
                const scope = context.sourceCode.getScope(node);

                if (astUtils.isTestCase(node) && isGlobalScope(scope)) {
                    context.report({ node: callee, message: 'Unexpected global mocha test.' });
                }
            }
        };
    }
};
