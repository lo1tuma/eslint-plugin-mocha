import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, type BlockStatement, isBlockStatement, type ReturnStatement } from '../ast/node-types.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const asyncMethods = ['async', 'callback', 'promise'] as const;
const optionSchema = {
    type: 'object',
    properties: {
        allowedAsyncMethods: {
            type: 'array',
            items: {
                type: 'string',
                enum: asyncMethods
            },
            minItems: 1,
            uniqueItems: true
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type AsyncMethod = (typeof asyncMethods)[number];
type ResolvedOption = Option & { allowedAsyncMethods: AsyncMethod[]; };
const defaultOption: ResolvedOption = { allowedAsyncMethods: Array.from(asyncMethods) };
type AsyncCheck = (functionExpression: Readonly<AnyFunction>) => boolean;

function hasAsyncCallback(functionExpression: Readonly<AnyFunction>): boolean {
    return functionExpression.params.length === 1;
}

function isAsyncFunction(functionExpression: Readonly<AnyFunction>): boolean {
    return functionExpression.async === true;
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

function doesReturnPromise(functionExpression: Readonly<AnyFunction>): boolean {
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

const asyncChecksByMethod = {
    async: isAsyncFunction,
    callback: hasAsyncCallback,
    promise: doesReturnPromise
} as const satisfies Readonly<Record<AsyncMethod, AsyncCheck>>;

export const noSynchronousTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow synchronous tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-synchronous-tests.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedSynchronousTest: 'Unexpected synchronous test.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { allowedAsyncMethods } = getRuleOption<ResolvedOption>(context);
        const asyncChecks = allowedAsyncMethods.map<AsyncCheck>((method) => {
            return asyncChecksByMethod[method];
        });

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                if (visitorContext.type !== 'testCase' && visitorContext.type !== 'hook') {
                    return;
                }

                for (const checkAsync of asyncChecks) {
                    if (checkAsync(visitorContext.node)) {
                        return;
                    }
                }

                context.report({ node: visitorContext.node, messageId: 'unexpectedSynchronousTest' });
            }
        });
    }
};
