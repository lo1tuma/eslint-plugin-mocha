import type { Rule, SourceCode } from 'eslint';
import { getAllNames } from '../mocha/all-name-details.js';
import type { MochaEntityType, MochaInterface, MochaModifier } from '../mocha/descriptors.js';
import { getAdditionalNames, getInterface } from '../settings.js';
import { findMochaVariableCalls, type ResolvedReferenceWithNameDetails } from './find-mocha-variable-calls.js';
import { isCallExpression } from './node-types.js';

type MochaVisitor = (context: Readonly<VisitorContext>) => void;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ok
type GenericVisitors = Partial<Record<string, ((value: any) => void) | undefined>>;

function callVisitorIfExists<Visitors extends GenericVisitors, Name extends keyof Visitors>(
    visitors: Visitors,
    name: Name,
    context: Parameters<Exclude<Visitors[Name], undefined>>[0]
): void {
    const visitor = visitors[name];
    if (typeof visitor === 'function') {
        visitor(context);
    }
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

type CachedVisitorContext = {
    readonly context: Readonly<VisitorContext>;
    readonly callbackContext: Readonly<VisitorContext> | undefined;
};

function callVisitorsForTestEntityCallback(
    visitors: Readonly<TestEntityVisitors>,
    name: keyof TestEntityVisitors,
    context: Readonly<VisitorContext> | undefined
): void {
    if (context !== undefined) {
        callVisitorIfExists(visitors, name, context);
    }
}

function createCachedVisitorContext(
    reference: Readonly<ResolvedReferenceWithNameDetails>
): Readonly<CachedVisitorContext> {
    const context = createContext(reference);
    const callbackNode = getFunctionExpressionLastArgument(context.node);

    return {
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

export type VisitorContext = {
    name: string;
    node: Rule.Node;
    type: MochaEntityType;
    modifier: MochaModifier | null;
    interface: MochaInterface;
};

function createContext(reference: Readonly<ResolvedReferenceWithNameDetails>): Readonly<VisitorContext> {
    return {
        name: reference.name,
        node: reference.node,
        type: reference.nameDetails.type,
        modifier: reference.nameDetails.modifier,
        interface: reference.nameDetails.interface
    };
}

// eslint-disable-next-line max-statements -- no good idea to split this up
function callVisitors(
    visitors: Readonly<MochaSpecificVisitors>,
    cachedVisitorContext: Readonly<CachedVisitorContext>,
    stageSuffix: '' | ':exit' = ''
): void {
    const { context, callbackContext } = cachedVisitorContext;

    if (context.type === 'config') {
        return;
    }
    if (context.type === 'testCase') {
        callVisitorIfExists(visitors, `testCase${stageSuffix}`, context);
        callVisitorIfExists(visitors, `suiteOrTestCase${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `testCaseCallback${stageSuffix}`, callbackContext);
    }
    if (context.type === 'suite') {
        callVisitorIfExists(visitors, `suite${stageSuffix}`, context);
        callVisitorIfExists(visitors, `suiteOrTestCase${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `suiteCallback${stageSuffix}`, callbackContext);
    }
    if (context.type === 'hook') {
        callVisitorIfExists(visitors, `hook${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `hookCallback${stageSuffix}`, callbackContext);
    }

    callVisitorIfExists(visitors, `anyTestEntity${stageSuffix}`, context);
    callVisitorsForTestEntityCallback(visitors, `anyTestEntityCallback${stageSuffix}`, callbackContext);
}

function processExpression(
    visitors: Readonly<MochaVisitors>,
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: Readonly<Rule.Node>,
    visitorName: keyof Rule.NodeListener
): void {
    const cachedVisitorContext = cachedVisitorContextsByNode.get(node.parent);
    const prefix: 'mocha' | 'nonMocha' = cachedVisitorContext === undefined ? 'nonMocha' : 'mocha';
    // @ts-expect-error -- ok in this case
    callVisitorIfExists(visitors, `${prefix}${visitorName}`, node);
    // @ts-expect-error -- ok in this case
    callVisitorIfExists(visitors, visitorName, node);
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
        ...nonMochaVisitors
    } = visitors;
    const mochaVisitors = {
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
        'anyTestEntityCallback:exit': anyTestEntityCallbackExit
    };
    const cachedVisitorContextsByNode = findCallsCached(context);
    const hasCallExpressionListener = (
        typeof nonMochaCallExpression === 'function' ||
        typeof testCase === 'function' ||
        typeof testCaseCallback === 'function' ||
        typeof suite === 'function' ||
        typeof suiteCallback === 'function' ||
        typeof hook === 'function' ||
        typeof hookCallback === 'function' ||
        typeof suiteOrTestCase === 'function' ||
        typeof anyTestEntity === 'function' ||
        typeof anyTestEntityCallback === 'function'
    );
    const hasCallExpressionExitListener = (
        typeof nonMochaCallExpressionExit === 'function' ||
        typeof testCaseExit === 'function' ||
        typeof testCaseCallbackExit === 'function' ||
        typeof suiteExit === 'function' ||
        typeof suiteCallbackExit === 'function' ||
        typeof hookExit === 'function' ||
        typeof hookCallbackExit === 'function' ||
        typeof suiteOrTestCaseExit === 'function' ||
        typeof anyTestEntityExit === 'function' ||
        typeof anyTestEntityCallbackExit === 'function'
    );
    const hasMemberExpressionListener = (
        typeof mochaMemberExpression === 'function' ||
        typeof nonMochaMemberExpression === 'function'
    );
    const hasMemberExpressionExitListener = (
        typeof mochaMemberExpressionExit === 'function' ||
        typeof nonMochaMemberExpressionExit === 'function'
    );
    const hasFunctionExpressionListener = (
        typeof mochaFunctionExpression === 'function' ||
        typeof nonMochaFunctionExpression === 'function'
    );
    const hasFunctionExpressionExitListener = (
        typeof mochaFunctionExpressionExit === 'function' ||
        typeof nonMochaFunctionExpressionExit === 'function'
    );
    const listeners: Rule.RuleListener = {
        ...nonMochaVisitors
    };

    if (hasCallExpressionListener) {
        listeners.CallExpression = function (node): void {
            const cachedVisitorContext = cachedVisitorContextsByNode.get(node);
            if (cachedVisitorContext === undefined) {
                callVisitorIfExists(mochaVisitors, 'nonMochaCallExpression', node);
            } else {
                callVisitors(mochaVisitors, cachedVisitorContext);
            }
            // @ts-expect-error -- ok in this case
            callVisitorIfExists(nonMochaVisitors, 'CallExpression', node);
        };
    }

    if (hasCallExpressionExitListener) {
        listeners['CallExpression:exit'] = function (node): void {
            const cachedVisitorContext = cachedVisitorContextsByNode.get(node);
            if (cachedVisitorContext === undefined) {
                callVisitorIfExists(mochaVisitors, 'nonMochaCallExpression:exit', node);
            } else {
                callVisitors(mochaVisitors, cachedVisitorContext, ':exit');
            }
            // @ts-expect-error -- ok in this case
            callVisitorIfExists(nonMochaVisitors, 'CallExpression:exit', node);
        };
    }

    if (hasMemberExpressionListener) {
        listeners.MemberExpression = function (node): void {
            processExpression(visitors, cachedVisitorContextsByNode, node, 'MemberExpression');
        };
    }

    if (hasMemberExpressionExitListener) {
        listeners['MemberExpression:exit'] = function (node): void {
            processExpression(visitors, cachedVisitorContextsByNode, node, 'MemberExpression:exit');
        };
    }

    if (hasFunctionExpressionListener) {
        listeners.FunctionExpression = function (node): void {
            processExpression(visitors, cachedVisitorContextsByNode, node, 'FunctionExpression');
        };
    }

    if (hasFunctionExpressionExitListener) {
        listeners['FunctionExpression:exit'] = function (node): void {
            processExpression(visitors, cachedVisitorContextsByNode, node, 'FunctionExpression:exit');
        };
    }

    return listeners;
}
