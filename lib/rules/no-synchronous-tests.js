import { find, isNil } from 'rambda';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

const asyncMethods = ['async', 'callback', 'promise'];

function hasAsyncCallback(functionExpression) {
    return functionExpression.params.length === 1;
}

function isAsyncFunction(functionExpression) {
    return functionExpression.async === true;
}

function findPromiseReturnStatement(nodes) {
    return find((node) => {
        return (
            node.type === 'ReturnStatement' &&
            node.argument &&
            node.argument.type !== 'Literal'
        );
    }, nodes);
}

function doesReturnPromise(functionExpression) {
    const bodyStatement = functionExpression.body;
    let returnStatement = null;

    if (bodyStatement.type === 'BlockStatement') {
        returnStatement = findPromiseReturnStatement(
            functionExpression.body.body
        );
    } else if (bodyStatement.type !== 'Literal') {
        //  allow arrow statements calling a promise with implicit return.
        returnStatement = bodyStatement;
    }

    return returnStatement !== null && returnStatement !== undefined;
}

export const noSynchronousTestsRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow synchronous tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-synchronous-tests.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowed: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: asyncMethods
                        },
                        minItems: 1,
                        uniqueItems: true
                    }
                }
            }
        ]
    },
    create(context) {
        const options = context.options[0] || {};
        const allowedAsyncMethods = isNil(options.allowed)
            ? asyncMethods
            : options.allowed;

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                // For each allowed async test method, check if it is used in the test
                const testAsyncMethods = allowedAsyncMethods.map((
                    method
                ) => {
                    switch (method) {
                        case 'async':
                            return isAsyncFunction(visitorContext.node);

                        case 'callback':
                            return hasAsyncCallback(visitorContext.node);

                        default:
                            return doesReturnPromise(visitorContext.node);
                    }
                });

                // Check that at least one allowed async test method is used in the test
                const isAsyncTest = testAsyncMethods.includes(true);

                if (!isAsyncTest) {
                    context.report({ node: visitorContext.node, message: 'Unexpected synchronous test.' });
                }
            }
        });
    }
};
