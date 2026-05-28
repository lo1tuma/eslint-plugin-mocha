import type { Rule, SourceCode } from 'eslint';
import { extractMemberExpressionPath, isConstantPath } from '../ast/member-expression.js';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction } from '../ast/node-types.js';
import { asRuleNode } from '../ast/rule-node.js';
import { type TraversableNode, visitWithoutNestedFunctions } from '../ast/visit-child-nodes.js';
import { getFirstMeaningfulParameter, hasCallbackParameter } from '../mocha/callback-parameter.js';
import { stripCallExpressions } from '../mocha/name-details.js';
import { isRecord } from '../record.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

type CallExpression = Extract<TraversableNode, { type: 'CallExpression'; }>;
type UnexpectedAsyncOperation = {
    messageId:
        | 'unexpectedCallbackAsyncOperation'
        | 'unexpectedPromiseAsyncOperation'
        | 'unexpectedScheduledAsyncOperation';
    node: TraversableNode;
};

type TypeCheckerLike = {
    getPromisedTypeOfPromise: (type: unknown) => unknown;
};

type ParserServicesWithTypeInformation = {
    getTypeAtLocation: (node: Readonly<Rule.Node>) => unknown;
    getPromisedTypeOfPromise: TypeCheckerLike['getPromisedTypeOfPromise'];
};

const errorCallbackNames = new Set(['err', 'error']);
const promiseMethodNames = new Set(['then', 'catch', 'finally']);
const knownScheduledAsyncMethods = new Set([
    'setImmediate',
    'setInterval',
    'setTimeout',
    'queueMicrotask',
    'process.nextTick',
    'global.setImmediate',
    'global.setInterval',
    'global.setTimeout',
    'global.queueMicrotask',
    'globalThis.setImmediate',
    'globalThis.setInterval',
    'globalThis.setTimeout',
    'globalThis.queueMicrotask',
    'window.setInterval',
    'window.setTimeout',
    'window.queueMicrotask'
]);
const optionSchema = {
    type: 'object',
    properties: {
        allowedAsyncMethods: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;
type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { allowedAsyncMethods: string[]; };
const defaultOption: ResolvedOption = { allowedAsyncMethods: [] };

type ExtractedExpression = Readonly<TraversableNode> | undefined;
const failedTypeLookup = Symbol('failed type lookup');

function collectExpressions(
    sourceCode: Readonly<SourceCode>,
    body: Readonly<AnyFunction['body']>,
    selectExpression: (node: Readonly<TraversableNode>) => ExtractedExpression
): TraversableNode[] {
    if (body.type !== 'BlockStatement') {
        return [body];
    }

    const expressions: TraversableNode[] = [];

    for (const statement of body.body) {
        visitWithoutNestedFunctions(sourceCode, statement, (node) => {
            const expression = selectExpression(node);

            if (expression !== undefined) {
                expressions.push(expression);
            }
        });
    }

    return expressions;
}

function getReturnedExpression(node: Readonly<TraversableNode>): ExtractedExpression {
    if (node.type !== 'ReturnStatement') {
        return undefined;
    }

    return node.argument ?? undefined;
}

function collectCandidateExpressions(
    sourceCode: Readonly<SourceCode>,
    body: Readonly<AnyFunction['body']>
): TraversableNode[] {
    return collectExpressions(sourceCode, body, (node) => {
        if (node.type === 'ExpressionStatement') {
            return node.expression;
        }

        return getReturnedExpression(node);
    });
}

function collectReturnedExpressions(
    sourceCode: Readonly<SourceCode>,
    body: Readonly<AnyFunction['body']>
): readonly TraversableNode[] {
    return collectExpressions(sourceCode, body, getReturnedExpression);
}

function isGetTypeAtLocation(
    value: unknown
): value is ParserServicesWithTypeInformation['getTypeAtLocation'] {
    return typeof value === 'function';
}

function isTypeCheckerFactory(value: unknown): value is () => unknown {
    return typeof value === 'function';
}

function isPromisedTypeReader(value: unknown): value is TypeCheckerLike['getPromisedTypeOfPromise'] {
    return typeof value === 'function';
}

function getParserServicesRecord(sourceCode: Readonly<SourceCode>): Record<string, unknown> | undefined {
    const parserServices: unknown = sourceCode.parserServices;

    return isRecord(parserServices) ? parserServices : undefined;
}

function getPromisedTypeReader(
    services: Readonly<Record<string, unknown>>
): TypeCheckerLike['getPromisedTypeOfPromise'] | undefined {
    const program = isRecord(services.program) ? services.program : undefined;

    if (!isTypeCheckerFactory(program?.getTypeChecker)) {
        return undefined;
    }

    const typeChecker = program.getTypeChecker();

    if (!isRecord(typeChecker) || !isPromisedTypeReader(typeChecker.getPromisedTypeOfPromise)) {
        return undefined;
    }

    return typeChecker.getPromisedTypeOfPromise;
}

function getParserServicesWithTypeInformation(
    sourceCode: Readonly<SourceCode>
): Readonly<ParserServicesWithTypeInformation> | undefined {
    const services = getParserServicesRecord(sourceCode);

    if (services === undefined || !isGetTypeAtLocation(services.getTypeAtLocation)) {
        return undefined;
    }

    const promisedTypeReader = getPromisedTypeReader(services);

    if (promisedTypeReader === undefined) {
        return undefined;
    }

    return {
        getTypeAtLocation: services.getTypeAtLocation,
        getPromisedTypeOfPromise: promisedTypeReader
    };
}

function getExpressionType(
    parserServices: Readonly<ParserServicesWithTypeInformation>,
    expression: Readonly<TraversableNode>
): unknown {
    try {
        return parserServices.getTypeAtLocation(asRuleNode(expression));
    } catch {
        return failedTypeLookup;
    }
}

function hasPromiseLikeType(
    parserServices: Readonly<ParserServicesWithTypeInformation>,
    expression: Readonly<TraversableNode>
): boolean {
    const type = getExpressionType(parserServices, expression);

    return type !== failedTypeLookup && parserServices.getPromisedTypeOfPromise(type) !== undefined;
}

function unwrapChainExpression(node: Readonly<TraversableNode>): Readonly<TraversableNode> {
    return node.type === 'ChainExpression' ? node.expression : node;
}

function getNamedPropertyName(
    node: Readonly<Extract<TraversableNode, { type: 'MemberExpression'; }>>
): string | undefined {
    return !node.computed && node.property.type === 'Identifier' ? node.property.name : undefined;
}

function getStaticPropertyName(node: Readonly<TraversableNode>): string | undefined {
    if (node.type !== 'MemberExpression') {
        return undefined;
    }

    if (node.property.type === 'Literal') {
        return String(node.property.value);
    }

    return getNamedPropertyName(node);
}

function isPromiseMethodCall(node: Readonly<CallExpression>): boolean {
    const callee = unwrapChainExpression(node.callee);

    return promiseMethodNames.has(getStaticPropertyName(callee) ?? '');
}

function collectCallExpressions(
    sourceCode: Readonly<SourceCode>,
    expression: Readonly<TraversableNode>
): readonly Readonly<CallExpression>[] {
    const callExpressions: CallExpression[] = [];

    visitWithoutNestedFunctions(sourceCode, expression, (node) => {
        if (node.type === 'CallExpression') {
            callExpressions.push(node);
        }
    });

    return callExpressions;
}

function findPromiseMethodCall(
    sourceCode: Readonly<SourceCode>,
    expression: Readonly<TraversableNode>
): Readonly<CallExpression | undefined> {
    return collectCallExpressions(sourceCode, expression).find(isPromiseMethodCall);
}

function hasErrorFirstCallback(node: Readonly<AnyFunction>): boolean {
    const firstParam = getFirstMeaningfulParameter(node);
    const errorCallbackName = firstParam?.type === 'Identifier' ? firstParam.name : '';

    return errorCallbackNames.has(errorCallbackName);
}

function hasInlineErrorFirstCallback(node: Readonly<CallExpression>): boolean {
    return node.arguments.some((argument) => {
        return isFunction(argument) && hasErrorFirstCallback(argument);
    });
}

function findCallbackBasedAsyncCall(
    sourceCode: Readonly<SourceCode>,
    expression: Readonly<TraversableNode>
): Readonly<CallExpression | undefined> {
    return collectCallExpressions(sourceCode, expression).find(hasInlineErrorFirstCallback);
}

function normalizeCalledMethodPath(nodePath: readonly string[]): string {
    return stripCallExpressions(nodePath).join('.');
}

function isScheduledAsyncCall(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<CallExpression>,
    allowedAsyncMethods: ReadonlySet<string>
): boolean {
    const path = extractMemberExpressionPath(sourceCode, asRuleNode(node.callee));

    if (!isConstantPath(path)) {
        return false;
    }

    const calledMethod = normalizeCalledMethodPath(path);

    return knownScheduledAsyncMethods.has(calledMethod) && !allowedAsyncMethods.has(calledMethod);
}

function findScheduledAsyncCall(
    sourceCode: Readonly<SourceCode>,
    expression: Readonly<TraversableNode>,
    allowedAsyncMethods: ReadonlySet<string>
): Readonly<CallExpression | undefined> {
    return collectCallExpressions(sourceCode, expression).find((callExpression) => {
        return isScheduledAsyncCall(sourceCode, callExpression, allowedAsyncMethods);
    });
}

function returnsPromiseToMocha(
    sourceCode: Readonly<SourceCode>,
    parserServices: Readonly<ParserServicesWithTypeInformation> | undefined,
    node: Readonly<AnyFunction>
): boolean {
    return collectReturnedExpressions(sourceCode, node.body).some((expression) => {
        return parserServices === undefined
            ? findPromiseMethodCall(sourceCode, expression) !== undefined
            : hasPromiseLikeType(parserServices, expression);
    });
}

function isSynchronousMochaCallback(
    sourceCode: Readonly<SourceCode>,
    parserServices: Readonly<ParserServicesWithTypeInformation> | undefined,
    node: Readonly<AnyFunction>
): boolean {
    return node.async !== true &&
        !hasCallbackParameter(node) &&
        !returnsPromiseToMocha(sourceCode, parserServices, node);
}

function createUnexpectedAsyncOperation(
    node: Readonly<TraversableNode>,
    messageId: UnexpectedAsyncOperation['messageId']
): Readonly<UnexpectedAsyncOperation> {
    return { node, messageId };
}

function findUnexpectedPromiseAsyncOperation(
    sourceCode: Readonly<SourceCode>,
    parserServices: Readonly<ParserServicesWithTypeInformation> | undefined,
    expression: Readonly<TraversableNode>
): Readonly<UnexpectedAsyncOperation | undefined> {
    if (parserServices !== undefined && hasPromiseLikeType(parserServices, expression)) {
        return createUnexpectedAsyncOperation(expression, 'unexpectedPromiseAsyncOperation');
    }

    const promiseMethodCall = parserServices === undefined
        ? findPromiseMethodCall(sourceCode, expression)
        : undefined;

    return promiseMethodCall === undefined
        ? undefined
        : createUnexpectedAsyncOperation(promiseMethodCall, 'unexpectedPromiseAsyncOperation');
}

function findUnexpectedScheduledAsyncOperation(
    sourceCode: Readonly<SourceCode>,
    expression: Readonly<TraversableNode>,
    allowedAsyncMethods: ReadonlySet<string>
): Readonly<UnexpectedAsyncOperation | undefined> {
    const scheduledAsyncCall = findScheduledAsyncCall(sourceCode, expression, allowedAsyncMethods);

    return scheduledAsyncCall === undefined
        ? undefined
        : createUnexpectedAsyncOperation(scheduledAsyncCall, 'unexpectedScheduledAsyncOperation');
}

function findUnexpectedAsyncOperation(
    sourceCode: Readonly<SourceCode>,
    parserServices: Readonly<ParserServicesWithTypeInformation> | undefined,
    expression: Readonly<TraversableNode>,
    allowedAsyncMethods: ReadonlySet<string>
): Readonly<UnexpectedAsyncOperation> | undefined {
    const unexpectedPromiseAsyncOperation = findUnexpectedPromiseAsyncOperation(
        sourceCode,
        parserServices,
        expression
    );

    if (unexpectedPromiseAsyncOperation !== undefined) {
        return unexpectedPromiseAsyncOperation;
    }

    const unexpectedScheduledAsyncOperation = findUnexpectedScheduledAsyncOperation(
        sourceCode,
        expression,
        allowedAsyncMethods
    );

    if (unexpectedScheduledAsyncOperation !== undefined) {
        return unexpectedScheduledAsyncOperation;
    }

    const callbackBasedAsyncCall = findCallbackBasedAsyncCall(sourceCode, expression);

    return callbackBasedAsyncCall === undefined
        ? undefined
        : createUnexpectedAsyncOperation(callbackBasedAsyncCall, 'unexpectedCallbackAsyncOperation');
}

function reportUnexpectedAsyncOperation(
    context: Readonly<Rule.RuleContext>,
    unexpectedAsyncOperation: Readonly<UnexpectedAsyncOperation>
): void {
    context.report({
        node: asRuleNode(unexpectedAsyncOperation.node),
        messageId: unexpectedAsyncOperation.messageId
    });
}

export const noAsyncInSyncTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow async operations in synchronous tests or hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-async-in-sync-tests.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedCallbackAsyncOperation:
                'Unexpected callback-based async operation in a synchronous test or hook.',
            unexpectedPromiseAsyncOperation: 'Unexpected promise-based async operation in a synchronous test or hook.',
            unexpectedScheduledAsyncOperation: 'Unexpected scheduled async operation in a synchronous test or hook.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { sourceCode } = context;
        const { allowedAsyncMethods } = getRuleOption<ResolvedOption>(context);
        const allowedAsyncMethodSet = new Set(allowedAsyncMethods);
        const parserServices = getParserServicesWithTypeInformation(sourceCode);

        function reportUnexpectedAsyncOperations(node: Readonly<Rule.Node>): void {
            if (!isFunction(node) || !isSynchronousMochaCallback(sourceCode, parserServices, node)) {
                return;
            }

            for (const expression of collectCandidateExpressions(sourceCode, node.body)) {
                const unexpectedAsyncOperation = findUnexpectedAsyncOperation(
                    sourceCode,
                    parserServices,
                    expression,
                    allowedAsyncMethodSet
                );

                if (unexpectedAsyncOperation !== undefined) {
                    reportUnexpectedAsyncOperation(context, unexpectedAsyncOperation);
                }
            }
        }

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                if (visitorContext.type !== 'testCase' && visitorContext.type !== 'hook') {
                    return;
                }

                reportUnexpectedAsyncOperations(visitorContext.node);
            }
        });
    }
};
