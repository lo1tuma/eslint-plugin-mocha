import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { getAllCustomNameDetails, getCustomNameDetailsForInterface } from '../mocha/all-name-details.ts';
import type { MochaConfigCall, MochaEntityType, MochaInterface, MochaModifier } from '../mocha/descriptors.ts';
import { getAdditionalNames, getInterface } from '../settings.ts';
import { findMochaVariableCalls, type ResolvedReferenceWithNameDetails } from './find-mocha-variable-calls.ts';
import {
    type AnyFunctionExpressionNode,
    getFunctionExpressionLastArgument
} from './function-expression-arguments.ts';
import { createListenerRecord } from './listener-record.ts';
import { expectCallExpression } from './node-types.ts';

type MochaVisitor = (context: Readonly<VisitorContext>) => void;
type ExpressionListener<Name extends keyof Rule.RuleListener> = Exclude<Rule.RuleListener[Name], undefined>;
type CallExpressionNode = Readonly<Parameters<ExpressionListener<'CallExpression'>>[0]>;
type FunctionExpressionNode = Readonly<Parameters<ExpressionListener<'FunctionExpression'>>[0]>;
type MemberExpressionNode = Readonly<Parameters<ExpressionListener<'MemberExpression'>>[0]>;
type CallExpressionNodeVisitor = (node: CallExpressionNode) => void;
type MochaCallbackVisitor = (context: Readonly<CallbackVisitorContext>) => void;
type TestEntityVisitors = {
    readonly config?: MochaVisitor | undefined;
    readonly 'config:exit'?: MochaVisitor | undefined;
    readonly testCase?: MochaVisitor | undefined;
    readonly 'testCase:exit'?: MochaVisitor | undefined;
    readonly testCaseCallback?: MochaCallbackVisitor | undefined;
    readonly 'testCaseCallback:exit'?: MochaCallbackVisitor | undefined;
    readonly suite?: MochaVisitor | undefined;
    readonly 'suite:exit'?: MochaVisitor | undefined;
    readonly suiteCallback?: MochaCallbackVisitor | undefined;
    readonly 'suiteCallback:exit'?: MochaCallbackVisitor | undefined;
    readonly hook?: MochaVisitor | undefined;
    readonly 'hook:exit'?: MochaVisitor | undefined;
    readonly hookCallback?: MochaCallbackVisitor | undefined;
    readonly 'hookCallback:exit'?: MochaCallbackVisitor | undefined;
    readonly suiteOrTestCase?: MochaVisitor | undefined;
    readonly 'suiteOrTestCase:exit'?: MochaVisitor | undefined;
    readonly anyTestEntity?: MochaVisitor | undefined;
    readonly 'anyTestEntity:exit'?: MochaVisitor | undefined;
    readonly anyTestEntityCallback?: MochaCallbackVisitor | undefined;
    readonly 'anyTestEntityCallback:exit'?: MochaCallbackVisitor | undefined;
};

type MochaSpecificVisitors = TestEntityVisitors & {
    readonly nonMochaCallExpression?: Rule.RuleListener['CallExpression'];
    readonly 'nonMochaCallExpression:exit'?: Rule.RuleListener['CallExpression:exit'];
    readonly mochaMemberExpression?: Rule.RuleListener['MemberExpression'];
    readonly nonMochaMemberExpression?: Rule.RuleListener['MemberExpression'];
    readonly 'mochaMemberExpression:exit'?: Rule.RuleListener['MemberExpression:exit'];
    readonly 'nonMochaMemberExpression:exit'?: Rule.RuleListener['MemberExpression:exit'];
    readonly mochaFunctionExpression?: Rule.RuleListener['FunctionExpression'];
    readonly nonMochaFunctionExpression?: Rule.RuleListener['FunctionExpression'];
    readonly 'mochaFunctionExpression:exit'?: Rule.RuleListener['FunctionExpression:exit'];
    readonly 'nonMochaFunctionExpression:exit'?: Rule.RuleListener['FunctionExpression:exit'];
};

type RemoveIndex<T> = {
    [
        K in keyof T as string extends K ? never // eslint-disable-line @stylistic/indent -- conflict with dprint
            : number extends K ? never // eslint-disable-line @stylistic/indent -- conflict with dprint
            : symbol extends K ? never
            : K // eslint-disable-line @stylistic/indent -- conflict with dprint
    ]: T[K];
};

type MochaVisitors = Readonly<
    & MochaSpecificVisitors
    & Record<`${string},${string}`, (node: Readonly<Rule.Node>) => void>
    & RemoveIndex<Rule.RuleListener>
>;

const mochaEntityKind = {
    Config: 'config',
    TestCase: 'testCase',
    Suite: 'suite',
    Hook: 'hook'
} as const;
type MochaEntityKind = typeof mochaEntityKind[keyof typeof mochaEntityKind];

export type VisitorContext = {
    readonly name: string;
    readonly node: Rule.Node;
    readonly type: MochaEntityType;
    readonly config: MochaConfigCall | null;
    readonly modifier: MochaModifier | null;
    readonly interface: MochaInterface;
};
type CallbackVisitorContext = Except<VisitorContext, 'node'> & { readonly node: AnyFunctionExpressionNode; };
type CachedMochaCall = {
    readonly kind: MochaEntityKind;
    readonly reference: Readonly<ResolvedReferenceWithNameDetails>;
};

type CallExpressionDispatchers = {
    readonly config?: MochaVisitor | undefined;
    readonly testCase?: MochaVisitor | undefined;
    readonly testCaseCallback?: MochaCallbackVisitor | undefined;
    readonly suite?: MochaVisitor | undefined;
    readonly suiteCallback?: MochaCallbackVisitor | undefined;
    readonly hook?: MochaVisitor | undefined;
    readonly hookCallback?: MochaCallbackVisitor | undefined;
    readonly suiteOrTestCase?: MochaVisitor | undefined;
    readonly anyTestEntity?: MochaVisitor | undefined;
    readonly anyTestEntityCallback?: MochaCallbackVisitor | undefined;
};

type CallExpressionDispatcher = (cachedMochaCall: Readonly<CachedMochaCall>) => void;
type CallExpressionDispatchGroup = {
    readonly visitor?: MochaVisitor | undefined;
    readonly callbackVisitor?: MochaCallbackVisitor | undefined;
    readonly suiteOrTestCaseVisitor?: MochaVisitor | undefined;
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

const mochaEntityKinds: Readonly<Record<MochaEntityType, MochaEntityKind>> = {
    config: mochaEntityKind.Config,
    testCase: mochaEntityKind.TestCase,
    suite: mochaEntityKind.Suite,
    hook: mochaEntityKind.Hook
};

function getMochaEntityKind(type: MochaEntityType): MochaEntityKind {
    return mochaEntityKinds[type];
}

function createContext(reference: Readonly<ResolvedReferenceWithNameDetails>): Readonly<VisitorContext> {
    return {
        name: reference.name,
        node: reference.node,
        type: reference.nameDetails.type,
        config: reference.nameDetails.config,
        modifier: reference.nameDetails.modifier,
        interface: reference.nameDetails.interface
    };
}

function createCachedMochaCall(
    reference: Readonly<ResolvedReferenceWithNameDetails>
): Readonly<CachedMochaCall> {
    return {
        kind: getMochaEntityKind(reference.nameDetails.type),
        reference
    };
}

function createMochaCallCache(
    references: readonly ResolvedReferenceWithNameDetails[]
): Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>> {
    const cache = new WeakMap<Rule.Node, Readonly<CachedMochaCall>>();

    for (const reference of references) {
        cache.set(reference.node, createCachedMochaCall(reference));
    }

    return cache;
}

function createCallExpressionDispatchGroup(
    visitor: MochaVisitor | undefined,
    callbackVisitor: MochaCallbackVisitor | undefined,
    suiteOrTestCaseVisitor: MochaVisitor | undefined
): Readonly<CallExpressionDispatchGroup> | undefined {
    if (visitor === undefined && callbackVisitor === undefined && suiteOrTestCaseVisitor === undefined) {
        return undefined;
    }

    return {
        visitor,
        callbackVisitor,
        suiteOrTestCaseVisitor
    };
}

function dispatchCallback(
    visitor: MochaCallbackVisitor | undefined,
    context: Readonly<VisitorContext>
): void {
    const callbackNode = getFunctionExpressionLastArgument(expectCallExpression(context.node));

    if (callbackNode !== undefined) {
        const callbackContext = { ...context, node: callbackNode };
        visitor?.(callbackContext);
    }
}

function dispatchSpecificCallExpressionContext(
    group: Readonly<CallExpressionDispatchGroup> | undefined,
    context: Readonly<VisitorContext>
): void {
    if (group === undefined) {
        return;
    }

    group.visitor?.(context);
    group.suiteOrTestCaseVisitor?.(context);
    dispatchCallback(group.callbackVisitor, context);
}

function dispatchCallExpressionContext(
    kind: MochaEntityKind,
    group: Readonly<CallExpressionDispatchGroup> | undefined,
    dispatchers: Readonly<CallExpressionDispatchers>,
    cachedMochaCall: Readonly<CachedMochaCall>
): void {
    const context = createContext(cachedMochaCall.reference);

    if (kind === mochaEntityKind.Config) {
        group?.visitor?.(context);
        return;
    }

    dispatchSpecificCallExpressionContext(group, context);
    dispatchers.anyTestEntity?.(context);
    dispatchCallback(dispatchers.anyTestEntityCallback, context);
}

function createCallExpressionDispatcher(
    dispatchers: Readonly<CallExpressionDispatchers>
): CallExpressionDispatcher | undefined {
    const groups: Readonly<Record<MochaEntityKind, Readonly<CallExpressionDispatchGroup> | undefined>> = {
        [mochaEntityKind.Config]: createCallExpressionDispatchGroup(dispatchers.config, undefined, undefined),
        [mochaEntityKind.TestCase]: createCallExpressionDispatchGroup(
            dispatchers.testCase,
            dispatchers.testCaseCallback,
            dispatchers.suiteOrTestCase
        ),
        [mochaEntityKind.Suite]: createCallExpressionDispatchGroup(
            dispatchers.suite,
            dispatchers.suiteCallback,
            dispatchers.suiteOrTestCase
        ),
        [mochaEntityKind.Hook]: createCallExpressionDispatchGroup(
            dispatchers.hook,
            dispatchers.hookCallback,
            undefined
        )
    };
    const hasDispatcher = [
        groups[mochaEntityKind.Config],
        groups[mochaEntityKind.TestCase],
        groups[mochaEntityKind.Suite],
        groups[mochaEntityKind.Hook],
        dispatchers.anyTestEntity,
        dispatchers.anyTestEntityCallback
    ]
        .some(function (dispatcher) {
            return dispatcher !== undefined;
        });

    if (!hasDispatcher) {
        return undefined;
    }

    return function (cachedMochaCall): void {
        dispatchCallExpressionContext(
            cachedMochaCall.kind,
            groups[cachedMochaCall.kind],
            dispatchers,
            cachedMochaCall
        );
    };
}

function callExpressionVisitor(
    cachedMochaCallsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>,
    node: CallExpressionNode,
    listenerSet: Readonly<CallExpressionListenerSet>
): void {
    const { mocha, nonMocha, generic } = listenerSet;
    const cachedMochaCall = cachedMochaCallsByNode.get(node);
    if (cachedMochaCall === undefined) {
        nonMocha?.(node);
    } else {
        mocha?.(cachedMochaCall);
    }
    generic?.(node);
}

function expressionVisitor<Node extends FunctionExpressionNode | MemberExpressionNode>(
    cachedMochaCallsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>,
    node: Node,
    listenerSet: Readonly<ExpressionListenerSet<Node>>
): void {
    const { mocha, nonMocha, generic } = listenerSet;
    if (cachedMochaCallsByNode.has(node.parent)) {
        mocha?.(node);
    } else {
        nonMocha?.(node);
    }
    generic?.(node);
}

const cachedCalls = new Map<
    string,
    WeakMap<SourceCode, Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>>
>();

type CreateMochaVisitorOptions = {
    readonly includeAllInterfaces?: boolean;
};

// eslint-disable-next-line max-statements -- caching with two cache keys, requires weird dance of statements
function findCallsCached(
    context: Readonly<Rule.RuleContext>,
    options: Readonly<CreateMochaVisitorOptions>
): Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>> {
    const settingsCacheKey = JSON.stringify({
        settings: context.settings,
        includeAllInterfaces: options.includeAllInterfaces === true
    });
    let callsPerSettings = cachedCalls.get(settingsCacheKey);
    if (callsPerSettings === undefined) {
        callsPerSettings = new WeakMap();
        cachedCalls.set(settingsCacheKey, callsPerSettings);
    }

    const callCacheKey = context.sourceCode;
    let cachedMochaCallsByNode = callsPerSettings.get(callCacheKey);
    if (cachedMochaCallsByNode === undefined) {
        const additionalCustomNames = getAdditionalNames(context.settings);
        const interfaceToUse = getInterface(context.settings);
        const includeAllInterfaces = options.includeAllInterfaces === true;
        const customNames = includeAllInterfaces
            ? getAllCustomNameDetails(additionalCustomNames)
            : getCustomNameDetailsForInterface(additionalCustomNames, interfaceToUse);
        const calls = findMochaVariableCalls(
            context,
            customNames,
            interfaceToUse,
            includeAllInterfaces
        );

        cachedMochaCallsByNode = createMochaCallCache(calls);
        callsPerSettings.set(callCacheKey, cachedMochaCallsByNode);
    }

    return cachedMochaCallsByNode;
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
        config,
        'config:exit': configExit,
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
            config,
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
            config: configExit,
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
    cachedMochaCallsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>,
    listenerSet: Readonly<CallExpressionListenerSet>
): CallExpressionNodeVisitor | undefined {
    if (listenerSet.mocha === undefined && listenerSet.nonMocha === undefined && listenerSet.generic === undefined) {
        return undefined;
    }

    return function (node): void {
        callExpressionVisitor(cachedMochaCallsByNode, node, listenerSet);
    };
}

function createExpressionRuleListener<Node extends FunctionExpressionNode | MemberExpressionNode>(
    cachedMochaCallsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>,
    listenerSet: Readonly<ExpressionListenerSet<Node>>
): ((node: Node) => void) | undefined {
    if (listenerSet.mocha === undefined && listenerSet.nonMocha === undefined && listenerSet.generic === undefined) {
        return undefined;
    }

    return function (node): void {
        expressionVisitor(cachedMochaCallsByNode, node, listenerSet);
    };
}

function createSpecificVisitors(
    cachedMochaCallsByNode: Readonly<WeakMap<Rule.Node, Readonly<CachedMochaCall>>>,
    visitors: Readonly<SplitMochaVisitors>
): Readonly<Rule.RuleListener> {
    const callExpressionEnterListener = createCallExpressionRuleListener(cachedMochaCallsByNode, {
        ...visitors.callExpressionListeners.enter,
        mocha: createCallExpressionDispatcher(visitors.enterDispatchers)
    });
    const callExpressionExitListener = createCallExpressionRuleListener(cachedMochaCallsByNode, {
        ...visitors.callExpressionListeners.exit,
        mocha: createCallExpressionDispatcher(visitors.exitDispatchers)
    });
    const memberExpressionEnterListener = createExpressionRuleListener(
        cachedMochaCallsByNode,
        visitors.memberExpressionListeners.enter
    );
    const memberExpressionExitListener = createExpressionRuleListener(
        cachedMochaCallsByNode,
        visitors.memberExpressionListeners.exit
    );
    const functionExpressionEnterListener = createExpressionRuleListener(
        cachedMochaCallsByNode,
        visitors.functionExpressionListeners.enter
    );
    const functionExpressionExitListener = createExpressionRuleListener(
        cachedMochaCallsByNode,
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
    visitors: Readonly<MochaVisitors>,
    options: Readonly<CreateMochaVisitorOptions> = {}
): Readonly<Rule.RuleListener> {
    const splitVisitors = splitMochaVisitors(visitors);
    const cachedMochaCallsByNode = findCallsCached(context, options);

    return {
        ...splitVisitors.genericVisitors,
        ...createSpecificVisitors(cachedMochaCallsByNode, splitVisitors)
    };
}
