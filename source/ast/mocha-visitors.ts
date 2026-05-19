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
type ArrowFunctionExpressionNode = Parameters<ExpressionListener<'ArrowFunctionExpression'>>[0];
type AnyFunctionExpressionNode = ArrowFunctionExpressionNode | FunctionExpressionNode;
type CallExpressionNodeVisitor = (node: CallExpressionNode) => void;

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

function isAnyFunctionExpression(
    node: Readonly<CallExpressionNode['arguments'][number]>
): node is AnyFunctionExpressionNode {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function getFunctionExpressionLastArgument(
    node: Readonly<CallExpressionNode>
): Readonly<AnyFunctionExpressionNode | undefined> {
    const lastArgument = node.arguments.at(-1);
    return lastArgument !== undefined && isAnyFunctionExpression(lastArgument)
        ? lastArgument
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
type CallExpressionDispatchGroup = {
    readonly visitor?: MochaVisitor | undefined;
    readonly callbackVisitor?: MochaVisitor | undefined;
    readonly includeSuiteOrTestCase: boolean;
};
type SplitMochaVisitors = {
    readonly callExpressionListeners: {
        readonly enter: Readonly<CallExpressionListenerSet>;
        readonly exit: Readonly<CallExpressionListenerSet>;
    };
    readonly memberExpressionListeners: {
        readonly enter: Readonly<ExpressionListenerSet<MemberExpressionNode>>;
        readonly exit: Readonly<ExpressionListenerSet<MemberExpressionNode>>;
    };
    readonly functionExpressionListeners: {
        readonly enter: Readonly<ExpressionListenerSet<FunctionExpressionNode>>;
        readonly exit: Readonly<ExpressionListenerSet<FunctionExpressionNode>>;
    };
    readonly enterDispatchers: Readonly<CallExpressionDispatchers>;
    readonly exitDispatchers: Readonly<CallExpressionDispatchers>;
    readonly genericVisitors: RemoveIndex<Rule.RuleListener>;
};
type CallExpressionListenerSet = {
    readonly mocha?: CallExpressionDispatcher | undefined;
    readonly nonMocha?: CallExpressionNodeVisitor | undefined;
    readonly generic?: CallExpressionNodeVisitor | undefined;
};
type ExpressionListenerSet<Node extends Rule.Node> = {
    readonly mocha?: ((node: Node) => void) | undefined;
    readonly nonMocha?: ((node: Node) => void) | undefined;
    readonly generic?: ((node: Node) => void) | undefined;
};

const mochaEntityKinds = {
    config: MochaEntityKind.Config,
    testCase: MochaEntityKind.TestCase,
    suite: MochaEntityKind.Suite,
    hook: MochaEntityKind.Hook
} as const satisfies Readonly<Record<MochaEntityType, MochaEntityKind>>;

function getMochaEntityKind(type: MochaEntityType): MochaEntityKind {
    return mochaEntityKinds[type];
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
    const callbackNode = isCallExpression(context.node)
        ? getFunctionExpressionLastArgument(context.node)
        : undefined;

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

function createCallExpressionDispatchGroup(
    visitor: MochaVisitor | undefined,
    callbackVisitor: MochaVisitor | undefined,
    includeSuiteOrTestCase = false
): Readonly<CallExpressionDispatchGroup> | undefined {
    if (visitor === undefined && callbackVisitor === undefined && !includeSuiteOrTestCase) {
        return undefined;
    }

    return {
        visitor,
        callbackVisitor,
        includeSuiteOrTestCase
    };
}

function dispatchCallback(
    visitor: MochaVisitor | undefined,
    callbackContext: Readonly<VisitorContext> | undefined
): void {
    if (callbackContext !== undefined) {
        visitor?.(callbackContext);
    }
}

function dispatchSpecificCallExpressionContext(
    group: Readonly<CallExpressionDispatchGroup> | undefined,
    dispatchers: Readonly<CallExpressionDispatchers>,
    context: Readonly<VisitorContext>,
    callbackContext: Readonly<VisitorContext> | undefined
): void {
    if (group === undefined) {
        return;
    }

    group.visitor?.(context);
    if (group.includeSuiteOrTestCase) {
        dispatchers.suiteOrTestCase?.(context);
    }
    dispatchCallback(group.callbackVisitor, callbackContext);
}

function dispatchCallExpressionContext(
    kind: MochaEntityKind,
    group: Readonly<CallExpressionDispatchGroup> | undefined,
    dispatchers: Readonly<CallExpressionDispatchers>,
    cachedVisitorContext: Readonly<CachedVisitorContext>
): void {
    if (kind === MochaEntityKind.Config) {
        return;
    }

    const { context, callbackContext } = cachedVisitorContext;
    dispatchSpecificCallExpressionContext(group, dispatchers, context, callbackContext);
    dispatchers.anyTestEntity?.(context);
    dispatchCallback(dispatchers.anyTestEntityCallback, callbackContext);
}

function createCallExpressionDispatcher(
    dispatchers: Readonly<CallExpressionDispatchers>
): CallExpressionDispatcher | undefined {
    const groups = {
        [MochaEntityKind.Config]: undefined,
        [MochaEntityKind.TestCase]: createCallExpressionDispatchGroup(
            dispatchers.testCase,
            dispatchers.testCaseCallback,
            dispatchers.suiteOrTestCase !== undefined
        ),
        [MochaEntityKind.Suite]: createCallExpressionDispatchGroup(
            dispatchers.suite,
            dispatchers.suiteCallback,
            dispatchers.suiteOrTestCase !== undefined
        ),
        [MochaEntityKind.Hook]: createCallExpressionDispatchGroup(
            dispatchers.hook,
            dispatchers.hookCallback
        )
    } as const satisfies Readonly<Record<MochaEntityKind, Readonly<CallExpressionDispatchGroup> | undefined>>;

    if (
        groups[MochaEntityKind.TestCase] === undefined &&
        groups[MochaEntityKind.Suite] === undefined &&
        groups[MochaEntityKind.Hook] === undefined &&
        dispatchers.anyTestEntity === undefined &&
        dispatchers.anyTestEntityCallback === undefined
    ) {
        return undefined;
    }

    return function (cachedVisitorContext): void {
        dispatchCallExpressionContext(
            cachedVisitorContext.kind,
            groups[cachedVisitorContext.kind],
            dispatchers,
            cachedVisitorContext
        );
    };
}

function callExpressionVisitor(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: CallExpressionNode,
    listenerSet: Readonly<CallExpressionListenerSet>
): void {
    const { mocha, nonMocha, generic } = listenerSet;
    const cachedVisitorContext = cachedVisitorContextsByNode.get(node);
    if (cachedVisitorContext === undefined) {
        nonMocha?.(node);
    } else {
        mocha?.(cachedVisitorContext);
    }
    generic?.(node);
}

function expressionVisitor<Node extends FunctionExpressionNode | MemberExpressionNode>(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    node: Node,
    listenerSet: Readonly<ExpressionListenerSet<Node>>
): void {
    const { mocha, nonMocha, generic } = listenerSet;
    if (cachedVisitorContextsByNode.has(node.parent)) {
        mocha?.(node);
    } else {
        nonMocha?.(node);
    }
    generic?.(node);
}

const cachedCalls = new Map<
    string,
    WeakMap<SourceCode, Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>>
>();

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

function splitMochaVisitors(visitors: Readonly<MochaVisitors>): Readonly<SplitMochaVisitors> {
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

    return {
        callExpressionListeners: {
            enter: {
                nonMocha: nonMochaCallExpression,
                generic: genericVisitors.CallExpression
            },
            exit: {
                nonMocha: nonMochaCallExpressionExit,
                generic: genericVisitors['CallExpression:exit']
            }
        },
        memberExpressionListeners: {
            enter: {
                mocha: mochaMemberExpression,
                nonMocha: nonMochaMemberExpression,
                generic: genericVisitors.MemberExpression
            },
            exit: {
                mocha: mochaMemberExpressionExit,
                nonMocha: nonMochaMemberExpressionExit,
                generic: genericVisitors['MemberExpression:exit']
            }
        },
        functionExpressionListeners: {
            enter: {
                mocha: mochaFunctionExpression,
                nonMocha: nonMochaFunctionExpression,
                generic: genericVisitors.FunctionExpression
            },
            exit: {
                mocha: mochaFunctionExpressionExit,
                nonMocha: nonMochaFunctionExpressionExit,
                generic: genericVisitors['FunctionExpression:exit']
            }
        },
        enterDispatchers: {
            testCase,
            testCaseCallback,
            suite,
            suiteCallback,
            hook,
            hookCallback,
            suiteOrTestCase,
            anyTestEntity,
            anyTestEntityCallback
        },
        exitDispatchers: {
            testCase: testCaseExit,
            testCaseCallback: testCaseCallbackExit,
            suite: suiteExit,
            suiteCallback: suiteCallbackExit,
            hook: hookExit,
            hookCallback: hookCallbackExit,
            suiteOrTestCase: suiteOrTestCaseExit,
            anyTestEntity: anyTestEntityExit,
            anyTestEntityCallback: anyTestEntityCallbackExit
        },
        genericVisitors
    };
}

function createCallExpressionRuleListener(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    listenerSet: Readonly<CallExpressionListenerSet>
): CallExpressionNodeVisitor | undefined {
    if (listenerSet.mocha === undefined && listenerSet.nonMocha === undefined && listenerSet.generic === undefined) {
        return undefined;
    }

    return function (node): void {
        callExpressionVisitor(cachedVisitorContextsByNode, node, listenerSet);
    };
}

function createExpressionRuleListener<Node extends FunctionExpressionNode | MemberExpressionNode>(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    listenerSet: Readonly<ExpressionListenerSet<Node>>
): ((node: Node) => void) | undefined {
    if (listenerSet.mocha === undefined && listenerSet.nonMocha === undefined && listenerSet.generic === undefined) {
        return undefined;
    }

    return function (node): void {
        expressionVisitor(cachedVisitorContextsByNode, node, listenerSet);
    };
}

function createListenerRecord<Name extends keyof Rule.RuleListener>(
    name: Name,
    listener: Rule.RuleListener[Name]
): Partial<Rule.RuleListener> {
    const listeners: Partial<Rule.RuleListener> = {};
    if (listener !== undefined) {
        listeners[name] = listener;
    }

    return listeners;
}

function createSpecificVisitors(
    cachedVisitorContextsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedVisitorContext>>>,
    visitors: Readonly<SplitMochaVisitors>
): Readonly<Rule.RuleListener> {
    const callExpressionEnterListener = createCallExpressionRuleListener(cachedVisitorContextsByNode, {
        ...visitors.callExpressionListeners.enter,
        mocha: createCallExpressionDispatcher(visitors.enterDispatchers)
    });
    const callExpressionExitListener = createCallExpressionRuleListener(cachedVisitorContextsByNode, {
        ...visitors.callExpressionListeners.exit,
        mocha: createCallExpressionDispatcher(visitors.exitDispatchers)
    });
    const memberExpressionEnterListener = createExpressionRuleListener(
        cachedVisitorContextsByNode,
        visitors.memberExpressionListeners.enter
    );
    const memberExpressionExitListener = createExpressionRuleListener(
        cachedVisitorContextsByNode,
        visitors.memberExpressionListeners.exit
    );
    const functionExpressionEnterListener = createExpressionRuleListener(
        cachedVisitorContextsByNode,
        visitors.functionExpressionListeners.enter
    );
    const functionExpressionExitListener = createExpressionRuleListener(
        cachedVisitorContextsByNode,
        visitors.functionExpressionListeners.exit
    );

    return {
        ...createListenerRecord('CallExpression', callExpressionEnterListener),
        ...createListenerRecord('CallExpression:exit', callExpressionExitListener),
        ...createListenerRecord('MemberExpression', memberExpressionEnterListener),
        ...createListenerRecord('MemberExpression:exit', memberExpressionExitListener),
        ...createListenerRecord('FunctionExpression', functionExpressionEnterListener),
        ...createListenerRecord('FunctionExpression:exit', functionExpressionExitListener)
    };
}

export function createMochaVisitors(
    context: Readonly<Rule.RuleContext>,
    visitors: Readonly<MochaVisitors>
): Readonly<Rule.RuleListener> {
    const splitVisitors = splitMochaVisitors(visitors);
    const cachedVisitorContextsByNode = findCallsCached(context);

    return {
        ...splitVisitors.genericVisitors,
        ...createSpecificVisitors(cachedVisitorContextsByNode, splitVisitors)
    };
}
