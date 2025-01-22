import { createMochaVisitors } from '../ast/mochaVisitors.js';
import { findReturnStatement, isReturnOfUndefined } from '../util/ast.js';

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
        function isAllowedReturnStatement(node) {
            const { argument } = node;

            return (isReturnOfUndefined(node) || argument.type === 'Literal');
        }

        function reportIfFunctionWithBlock(node) {
            const returnStatement = findReturnStatement(node.body.body);

            if (returnStatement && !isAllowedReturnStatement(returnStatement)) {
                context.report({
                    node: returnStatement,
                    message: 'Unexpected use of `return` in a test with an async function'
                });
            }
        }

        function check(node) {
            if (!node.async) {
                return;
            }

            if (!reportIfShortArrowFunction(context, node)) {
                reportIfFunctionWithBlock(node);
            }
        }

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                check(visitorContext.node);
            }
        });
    }
};
