import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type BlockStatement, isBlockStatement, isFunction, type ReturnStatement } from '../ast/node-types.js';
import { isRecord } from '../record.js';

const asyncMethods = ['async', 'callback', 'promise'];

function hasAsyncCallback(functionExpression: Readonly<Rule.Node>): boolean {
    return isFunction(functionExpression) && functionExpression.params.length === 1;
}

function isAsyncFunction(functionExpression: Readonly<Rule.Node>): boolean {
    return isFunction(functionExpression) && functionExpression.async === true;
}

function findPromiseReturnStatement(nodes: Readonly<BlockStatement['body']>): Readonly<ReturnStatement | undefined> {
    return nodes.find((node): node is ReturnStatement => {
        return (
            node.type === 'ReturnStatement' &&
            node.argument !== null &&
            node.argument?.type !== 'Literal'
        );
    });
}

function doesReturnPromise(functionExpression: Readonly<Rule.Node>): boolean {
    if (!isFunction(functionExpression)) {
        return false;
    }
    const bodyStatement = functionExpression.body;
    let returnStatement: Except<Rule.Node, 'parent'> | null | undefined = null;

    if (isBlockStatement(bodyStatement)) {
        returnStatement = findPromiseReturnStatement(bodyStatement.body);
    } else if (bodyStatement.type !== 'Literal') {
        //  allow arrow statements calling a promise with implicit return.
        returnStatement = bodyStatement;
    }

    return returnStatement !== null && returnStatement !== undefined;
}

export const noSynchronousTestsRule: Readonly<Rule.RuleModule> = {
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
        const [firstOption] = context.options as unknown[];
        const options = isRecord(firstOption) ? firstOption : {};
        const allowedAsyncMethods = options.allowed === undefined
            ? asyncMethods
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- we have json schema validation in place so we know this is a string
            : options.allowed as unknown as string[];

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
