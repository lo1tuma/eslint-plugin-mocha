import type { Rule, SourceCode } from 'eslint';
import { getAllNames } from '../mocha/all-name-details.js';
import type { MochaEntityType, MochaInterface, MochaModifier } from '../mocha/descriptors.js';
import { getAdditionalNames, getInterface } from '../settings.js';
import { findMochaVariableCalls, type ResolvedReferenceWithNameDetails } from './find-mocha-variable-calls.js';
import { isCallExpression } from './node-types.js';

type MochaVisitor = (context: Readonly<VisitorContext>) => void;
type ExpressionListener<Name extends keyof Rule.RuleListener> = Exclude<Rule.RuleListener[Name], undefined>;
type CallExpressionNode = Parameters<ExpressionListener<'CallExpression'>>[0];
type MemberExpressionNode = Parameters<ExpressionListener<'MemberExpression'>>[0];
type FunctionExpressionNode = Parameters<ExpressionListener<'FunctionExpression'>>[0];

type TestEntityVisitors = {
    testCase?: MochaVisitor | undefined;
    'testCase:exit'?: MochaVisitor | undefined;
    testCaseCallback?: MochaVisitor | undefined;
    'testCaseCallback:exit'?: MochaVisitor | undefined;
    suite?: MochaVisitor | undefined;
    'suite:exit'?: MochaVisitor | undefined;
    suiteCallback?: MochaVisitor | undefined;
    'suiteCallback:exit'?: MochaVisitor | undefined;
    hook?: MochaVisitor | undefined;
    'hook:exit'?: MochaVisitor | undefined;
    hookCallback?: MochaVisitor | undefined;
    'hookCallback:exit'?: MochaVisitor | undefined;
    suiteOrTestCase?: MochaVisitor | undefined;
    'suiteOrTestCase:exit'?: MochaVisitor | undefined;
    anyTestEntity?: MochaVisitor | undefined;
    'anyTestEntity:exit'?: MochaVisitor | undefined;
    anyTestEntityCallback?: MochaVisitor | undefined;
    'anyTestEntityCallback:exit'?: MochaVisitor | undefined;
};

type MochaSpecificVisitors = TestEntityVisitors & {
    nonMochaCallExpression?: Rule.RuleListener['CallExpression'];
    'nonMochaCallExpression:exit'?: Rule.RuleListener['CallExpression:exit'];
    mochaMemberExpression?: Rule.RuleListener['MemberExpression'];
    nonMochaMemberExpression?: Rule.RuleListener['MemberExpression'];
    'mochaMemberExpression:exit'?: Rule.RuleListener['MemberExpression:exit'];
    'nonMochaMemberExpression:exit'?: Rule.RuleListener['MemberExpression:exit'];
    mochaFunctionExpression?: Rule.RuleListener['FunctionExpression'];
    nonMochaFunctionExpression?: Rule.RuleListener['FunctionExpression'];
    'mochaFunctionExpression:exit'?: Rule.RuleListener['FunctionExpression:exit'];
    'nonMochaFunctionExpression:exit'?: Rule.RuleListener['FunctionExpression:exit'];
};

type RemoveIndex<T> = {
    [
        K in keyof T as string extends K ? never // eslint-disable-line @stylistic/indent -- conflict with dprint
            : number extends K ? never // eslint-disable-line @stylistic/indent -- conflict with dprint
            : symbol extends K ? never
            : K // eslint-disable-line @stylistic/indent -- conflict with dprint
    ]: T[K];
};

type MochaVisitors =
    & MochaSpecificVisitors
    & Record<`${string},${string}`, (node: Readonly<Rule.Node>) => void>
    & RemoveIndex<Rule.RuleListener>;

const enum MochaEntityKind {
    Config,
    TestCase,
    Suite,
    Hook
}

function isAnyFunctionExpression(node: Readonly<Rule.Node>): boolean {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function getFunctionExpressionLastArgument(node: Readonly<Rule.Node>): Readonly<Rule.Node | undefined> {
    if (!isCallExpression(node)) {
        return undefined;
    }

    const lastArgument = node.arguments.at(-1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok
    return lastArgument !== undefined && isAnyFunctionExpression(lastArgument as Rule.Node)
        ? lastArgument as Rule.Node
        : undefined;
}

export type VisitorContext = {
    name: string;
    node: Rule.Node;
    type: MochaEntityType;
    modifier: MochaModifier | null;
    interface: MochaInterface;
};

type CachedVisitorContext = {
    readonly kind: MochaEntityKind;
    readonly context: Readonly<VisitorContext>;
    readonly callbackContext: Readonly<VisitorContext> | undefined;
};

type CallExpressionDispatchers = {
    readonly testCase?: MochaVisitor | undefined;
    readonly testCaseCallback?: MochaVisitor | undefined;
    readonly suite?: MochaVisitor | undefined;
    readonly suiteCallback?: MochaVisitor | undefined;
    readonly hook?: MochaVisitor | undefined;
    readonly hookCallback?: MochaVisitor | undefined;
    readonly suiteOrTestCase?: MochaVisitor | undefined;
    readonly anyTestEntity?: MochaVisitor | undefined;
    readonly anyTestEntityCallback?: MochaVisitor | undefined;
};

type CallExpressionDispatcher = (cachedVisitorContext: Readonly<CachedVisitorContext>) => void;

function getMochaEntityKind(type: MochaEntityType): MochaEntityKind {
    switch (type) {
        case 'testCase':
            return MochaEntityKind.TestCase;
        case 'suite':
            return MochaEntityKind.Suite;
        case 'hook':
            return MochaEntityKind.Hook;
        default:
            return MochaEntityKind.Config;
    }
}

function createContext(reference: Readonly<ResolvedReferenceWithNameDetails>): Readonly<VisitorContext> {
    return {
        name: reference.name,
        node: reference.node,
        type: reference.nameDetails.type,
        modifier: reference.nameDetails.modifier,
        interface: reference.nameDetails.interface
    };
}

function createCachedVisitorContext(
    reference: Readonly<ResolvedReferenceWithNameDetails>
): Readonly<CachedVisitorContext> {
    const context = createContext(reference);
    const callbackNode = getFunctionExpressionLastArgument(context.node);

    return {
        kind: getMochaEntityKind(context.type),
        context,
        callbackContext: callbackNode === undefined ? undefined : { ...context, node: callbackNode }
    };
}

function createVisitorContextCache(
    references: readonly ResolvedReferenceWithNameDetails[]
): Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>> {
    const cache = new WeakMap<Rule.Node, Readonly<CachedVisitorContext>>();

    for (const reference of references) {
        cache.set(reference.node, createCachedVisitorContext(reference));
    }

    return cache;
}

function createCallExpressionDispatcher(
    dispatchers: Readonly<CallExpressionDispatchers>
): CallExpressionDispatcher | undefined {
    const {
        testCase,
        testCaseCallback,
        suite,
        suiteCallback,
        hook,
        hookCallback,
        suiteOrTestCase,
        anyTestEntity,
        anyTestEntityCallback
    } = dispatchers;

    if (
        testCase === undefined &&
        testCaseCallback === undefined &&
        suite === undefined &&
        suiteCallback === undefined &&
        hook === undefined &&
        hookCallback === undefined &&
        suiteOrTestCase === undefined &&
        anyTestEntity === undefined &&
        anyTestEntityCallback === undefined
    ) {
        return undefined;
    }

    return function (cachedVisitorContext): void {
        const { kind, context, callbackContext } = cachedVisitorContext;

        switch (kind) {
            case MochaEntityKind.TestCase:
                testCase?.(context);
                suiteOrTestCase?.(context);
                if (callbackContext !== undefined) {
                    testCaseCallback?.(callbackContext);
                }
                break;
            case MochaEntityKind.Suite:
                suite?.(context);
                suiteOrTestCase?.(context);
                if (callbackContext !== undefined) {
                    suiteCallback?.(callbackContext);
                }
                break;
            case MochaEntityKind.Hook:
                hook?.(context);
                if (callbackContext !== undefined) {
                    hookCallback?.(callbackContext);
                }
                break;
            default:
                return;
        }

        anyTestEntity?.(context);
        if (callbackContext !== undefined) {
            anyTestEntityCallback?.(callbackContext);
        }
    };
}

function callExpressionVisitor(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: Readonly<Rule.Node>,
    mochaVisitor: CallExpressionDispatcher | undefined,
    nonMochaVisitor: ExpressionListener<'CallExpression'> | undefined,
    genericVisitor: ExpressionListener<'CallExpression'> | undefined
): void {
    const typedNode = node as CallExpressionNode;
    const cachedVisitorContext = cachedVisitorContextsByNode.get(node);
    if (cachedVisitorContext === undefined) {
        nonMochaVisitor?.(typedNode);
    } else {
        mochaVisitor?.(cachedVisitorContext);
    }
    genericVisitor?.(typedNode);
}

function memberExpressionVisitor(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: MemberExpressionNode,
    mochaVisitor: ExpressionListener<'MemberExpression'> | undefined,
    nonMochaVisitor: ExpressionListener<'MemberExpression'> | undefined,
    genericVisitor: ExpressionListener<'MemberExpression'> | undefined
): void {
    if (cachedVisitorContextsByNode.has(node.parent)) {
        mochaVisitor?.(node);
    } else {
        nonMochaVisitor?.(node);
    }
    genericVisitor?.(node);
}

function functionExpressionVisitor(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: FunctionExpressionNode,
    mochaVisitor: ExpressionListener<'FunctionExpression'> | undefined,
    nonMochaVisitor: ExpressionListener<'FunctionExpression'> | undefined,
    genericVisitor: ExpressionListener<'FunctionExpression'> | undefined
): void {
    if (cachedVisitorContextsByNode.has(node.parent)) {
        mochaVisitor?.(node);
    } else {
        nonMochaVisitor?.(node);
    }
    genericVisitor?.(node);
}

const cachedCalls = new Map<string, WeakMap<SourceCode, Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>>>();

// eslint-disable-next-line max-statements -- caching with two cache keys, requires weird dance of statements
function findCallsCached(
    context: Readonly<Rule.RuleContext>
): Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>> {
    const settingsCacheKey = JSON.stringify(context.settings);
    let callsPerSettings = cachedCalls.get(settingsCacheKey);
    if (callsPerSettings === undefined) {
        callsPerSettings = new WeakMap();
        cachedCalls.set(settingsCacheKey, callsPerSettings);
    }

    const callCacheKey = context.sourceCode;
    let cachedVisitorContextsByNode = callsPerSettings.get(callCacheKey);
    if (cachedVisitorContextsByNode === undefined) {
        const additionalCustomNames = getAdditionalNames(context.settings);
        const interfaceToUse = getInterface(context.settings);
        const names = getAllNames(additionalCustomNames);
        const calls = findMochaVariableCalls(context, names, interfaceToUse);

        cachedVisitorContextsByNode = createVisitorContextCache(calls);
        callsPerSettings.set(callCacheKey, cachedVisitorContextsByNode);
    }

    return cachedVisitorContextsByNode;
}

export function createMochaVisitors(
    context: Readonly<Rule.RuleContext>,
    visitors: Readonly<MochaVisitors>
): Readonly<Rule.RuleListener> {
    const {
        nonMochaCallExpression,
        'nonMochaCallExpression:exit': nonMochaCallExpressionExit,
        mochaMemberExpression,
        nonMochaMemberExpression,
        'mochaMemberExpression:exit': mochaMemberExpressionExit,
        'nonMochaMemberExpression:exit': nonMochaMemberExpressionExit,
        mochaFunctionExpression,
        nonMochaFunctionExpression,
        'mochaFunctionExpression:exit': mochaFunctionExpressionExit,
        'nonMochaFunctionExpression:exit': nonMochaFunctionExpressionExit,
        testCase,
        'testCase:exit': testCaseExit,
        testCaseCallback,
        'testCaseCallback:exit': testCaseCallbackExit,
        suite,
        'suite:exit': suiteExit,
        suiteCallback,
        'suiteCallback:exit': suiteCallbackExit,
        hook,
        'hook:exit': hookExit,
        hookCallback,
        'hookCallback:exit': hookCallbackExit,
        suiteOrTestCase,
        'suiteOrTestCase:exit': suiteOrTestCaseExit,
        anyTestEntity,
        'anyTestEntity:exit': anyTestEntityExit,
        anyTestEntityCallback,
        'anyTestEntityCallback:exit': anyTestEntityCallbackExit,
        ...genericVisitors
    } = visitors;
    const cachedVisitorContextsByNode = findCallsCached(context);
    const genericCallExpression = genericVisitors.CallExpression;
    const genericCallExpressionExit = genericVisitors['CallExpression:exit'];
    const genericMemberExpression = genericVisitors.MemberExpression;
    const genericMemberExpressionExit = genericVisitors['MemberExpression:exit'];
    const genericFunctionExpression = genericVisitors.FunctionExpression;
    const genericFunctionExpressionExit = genericVisitors['FunctionExpression:exit'];
    const callExpressionEnterDispatcher = createCallExpressionDispatcher({
        testCase,
        testCaseCallback,
        suite,
        suiteCallback,
        hook,
        hookCallback,
        suiteOrTestCase,
        anyTestEntity,
        anyTestEntityCallback
    });
    const callExpressionExitDispatcher = createCallExpressionDispatcher({
        testCase: testCaseExit,
        testCaseCallback: testCaseCallbackExit,
        suite: suiteExit,
        suiteCallback: suiteCallbackExit,
        hook: hookExit,
        hookCallback: hookCallbackExit,
        suiteOrTestCase: suiteOrTestCaseExit,
        anyTestEntity: anyTestEntityExit,
        anyTestEntityCallback: anyTestEntityCallbackExit
    });
    const hasCallExpressionListener = (
        typeof nonMochaCallExpression === 'function' ||
        callExpressionEnterDispatcher !== undefined ||
        typeof genericCallExpression === 'function'
    );
    const hasCallExpressionExitListener = (
        typeof nonMochaCallExpressionExit === 'function' ||
        callExpressionExitDispatcher !== undefined ||
        typeof genericCallExpressionExit === 'function'
    );
    const hasMemberExpressionListener = (
        typeof mochaMemberExpression === 'function' ||
        typeof nonMochaMemberExpression === 'function' ||
        typeof genericMemberExpression === 'function'
    );
    const hasMemberExpressionExitListener = (
        typeof mochaMemberExpressionExit === 'function' ||
        typeof nonMochaMemberExpressionExit === 'function' ||
        typeof genericMemberExpressionExit === 'function'
    );
    const hasFunctionExpressionListener = (
        typeof mochaFunctionExpression === 'function' ||
        typeof nonMochaFunctionExpression === 'function' ||
        typeof genericFunctionExpression === 'function'
    );
    const hasFunctionExpressionExitListener = (
        typeof mochaFunctionExpressionExit === 'function' ||
        typeof nonMochaFunctionExpressionExit === 'function' ||
        typeof genericFunctionExpressionExit === 'function'
    );
    const listeners: Rule.RuleListener = {
        ...genericVisitors
    };

    if (hasCallExpressionListener) {
        listeners.CallExpression = function (node): void {
            callExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                callExpressionEnterDispatcher,
                nonMochaCallExpression,
                genericCallExpression
            );
        };
    }

    if (hasCallExpressionExitListener) {
        listeners['CallExpression:exit'] = function (node): void {
            callExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                callExpressionExitDispatcher,
                nonMochaCallExpressionExit,
                genericCallExpressionExit
            );
        };
    }

    if (hasMemberExpressionListener) {
        listeners.MemberExpression = function (node): void {
            memberExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                mochaMemberExpression,
                nonMochaMemberExpression,
                genericMemberExpression
            );
        };
    }

    if (hasMemberExpressionExitListener) {
        listeners['MemberExpression:exit'] = function (node): void {
            memberExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                mochaMemberExpressionExit,
                nonMochaMemberExpressionExit,
                genericMemberExpressionExit
            );
        };
    }

    if (hasFunctionExpressionListener) {
        listeners.FunctionExpression = function (node): void {
            functionExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                mochaFunctionExpression,
                nonMochaFunctionExpression,
                genericFunctionExpression
            );
        };
    }

    if (hasFunctionExpressionExitListener) {
        listeners['FunctionExpression:exit'] = function (node): void {
            functionExpressionVisitor(
                cachedVisitorContextsByNode,
                node,
                mochaFunctionExpressionExit,
                nonMochaFunctionExpressionExit,
                genericFunctionExpressionExit
            );
        };
    }

    return listeners;
}
