import { createMochaVisitors } from '../ast/mochaVisitors.js';
import { findReturnStatement, isReturnOfUndefined } from '../util/ast.js';

function reportIfShortArrowFunction(context, node) {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with callback'
        });
        return true;
    }
    return false;
}

function isFunctionCallWithName(node, name) {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name;
}

export const noReturnAndCallbackRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow returning in a test or hook function that uses a callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-return-and-callback.md'
        },
        schema: []
    },
    create(context) {
        function isAllowedReturnStatement(node, doneName) {
            const { argument } = node;

            if (isReturnOfUndefined(node) || argument.type === 'Literal') {
                return true;
            }

            return isFunctionCallWithName(argument, doneName);
        }

        function reportIfFunctionWithBlock(node, doneName) {
            const returnStatement = findReturnStatement(node.body.body);
            if (returnStatement && !isAllowedReturnStatement(returnStatement, doneName)) {
                context.report({
                    node: returnStatement,
                    message: 'Unexpected use of `return` in a test with callback'
                });
            }
        }

        function check(node) {
            if (node.params.length === 0) {
                return;
            }

            if (!reportIfShortArrowFunction(context, node)) {
                reportIfFunctionWithBlock(node, node.params[0].name);
            }
        }

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                check(visitorContext.node);
            }
        });
    }
};
