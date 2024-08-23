import { createAstUtils } from '../util/ast.js';

function reportIfShortArrowFunction(context, node) {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with an async function'
        });
        return true;
    }
    return false;
}

export const noReturnFromAsyncRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow returning from an async test or hook',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-return-from-async.md'
        },
        schema: []
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);

        function isAllowedReturnStatement(node) {
            const { argument } = node;

            return (astUtils.isReturnOfUndefined(node) || argument.type === 'Literal');
        }

        function reportIfFunctionWithBlock(node) {
            const returnStatement = astUtils.findReturnStatement(node.body.body);

            if (returnStatement && !isAllowedReturnStatement(returnStatement)) {
                context.report({
                    node: returnStatement,
                    message: 'Unexpected use of `return` in a test with an async function'
                });
            }
        }

        function check(node) {
            if (!node.async || !astUtils.hasParentMochaFunctionCall(node)) {
                return;
            }

            if (!reportIfShortArrowFunction(context, node)) {
                reportIfFunctionWithBlock(node);
            }
        }

        return {
            FunctionExpression: check,
            ArrowFunctionExpression: check
        };
    }
};
