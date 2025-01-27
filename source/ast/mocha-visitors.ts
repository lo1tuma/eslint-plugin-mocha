import type { Rule, SourceCode } from 'eslint';
import { getAllNames } from '../mocha/all-name-details.js';
import { getAdditionalNames, getInterface } from '../settings.js';
import { findMochaVariableCalls, type ResolvedReferenceWithNameDetails } from './find-mocha-variable-calls.js';
import type { MochaEntityType, MochaInterface, MochaModifier } from '../mocha/descriptors.js';
import { isCallExpression } from './node-types.js';

type Range = [number,number]

function isSameRange(rangeA: Range, rangeB: Range): boolean {
    return rangeA[0] === rangeB[0] && rangeA[1] === rangeB[1];
}

function isSameNode(nodeA: Rule.Node, nodeB: Rule.Node): boolean {
    return nodeA.type === nodeB.type && isSameRange(nodeA.range!, nodeB.range!);
}

function getReferenceByNode(references: readonly ResolvedReferenceWithNameDetails[], node: Rule.Node): ResolvedReferenceWithNameDetails | undefined {
    return references.find((reference) => {
        return isSameNode(reference.node, node);
    });
}

type MochaVisitor = (context: VisitorContext) => void;

type TestEntityVisitors = {
    testCase?: MochaVisitor | undefined;
    'testCase:exit'?:MochaVisitor | undefined;
    testCaseCallback?:MochaVisitor | undefined;
    'testCaseCallback:exit'?: MochaVisitor | undefined;
    suite?:MochaVisitor | undefined;
    'suite:exit'?: MochaVisitor | undefined;
    suiteCallback?: MochaVisitor | undefined;
    'suiteCallback:exit'?: MochaVisitor | undefined;
    hook?: MochaVisitor | undefined;
    'hook:exit'?: MochaVisitor | undefined;
    hookCallback?: MochaVisitor | undefined;
    'hookCallback:exit'?: MochaVisitor | undefined;
    suiteOrTestCase?: MochaVisitor | undefined;
    'suiteOrTestCase:exit'?:MochaVisitor | undefined;
    anyTestEntity?: MochaVisitor | undefined;
    'anyTestEntity:exit'?: MochaVisitor | undefined;
    anyTestEntityCallback?: MochaVisitor | undefined;
    'anyTestEntityCallback:exit'?: MochaVisitor | undefined;
}

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
}


type MochaVisitors = Rule.RuleListener & MochaSpecificVisitors


type GenericVisitors = {[Key in string]?: ((value: any) => void) | undefined }

function callVisitorIfExists<Visitors extends GenericVisitors, Name extends keyof Visitors>(visitors: Visitors, name: Name, context: Parameters<Exclude<Visitors[Name], undefined>>[0]): void {
    const visitor = visitors[name];
    if (typeof visitor === 'function') {
        visitor(context);
    }
}

function isAnyFunctionExpression(node: Rule.Node): boolean {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function callVisitorsForTestEntityCallback(visitors: TestEntityVisitors, name: keyof TestEntityVisitors, context: VisitorContext): void {
    if (isCallExpression(context.node)) {
        const lastArgument = context.node.arguments.at(-1);
        if (lastArgument && isAnyFunctionExpression(lastArgument as Rule.Node)) {
            callVisitorIfExists(visitors, `${name}`, { ...context, node: lastArgument as Rule.Node });
        }
    }
}

type VisitorContext = {
    name: string;
    node: Rule.Node;
    type: MochaEntityType;
    modifier: MochaModifier | null;
    interface: MochaInterface;
}

function createContext(reference: ResolvedReferenceWithNameDetails): VisitorContext {
    return {
        name: reference.name,
        node: reference.node,
        type: reference.nameDetails.type,
        modifier: reference.nameDetails.modifier,
        interface: reference.nameDetails.interface
    };
}

// eslint-disable-next-line max-statements -- no good idea to split this up
function callVisitors(visitors: MochaSpecificVisitors, reference: ResolvedReferenceWithNameDetails, stageSuffix: ':exit' | '' = ''): void {
    const context = createContext(reference);

    if (context.type === 'config') {
        return;
    }
    if (context.type === 'testCase') {
        callVisitorIfExists(visitors, `testCase${stageSuffix}`, context);
        callVisitorIfExists(visitors, `suiteOrTestCase${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `testCaseCallback${stageSuffix}`, context);
    }
    if (context.type === 'suite') {
        callVisitorIfExists(visitors, `suite${stageSuffix}`, context);
        callVisitorIfExists(visitors, `suiteOrTestCase${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `suiteCallback${stageSuffix}`, context);
    }
    if (context.type === 'hook') {
        callVisitorIfExists(visitors, `hook${stageSuffix}`, context);
        callVisitorsForTestEntityCallback(visitors, `hookCallback${stageSuffix}`, context);
    }

    callVisitorIfExists(visitors, `anyTestEntity${stageSuffix}`, context);
    callVisitorsForTestEntityCallback(visitors, `anyTestEntityCallback${stageSuffix}`, context);
}

function processExpression(visitors: MochaVisitors, calls: readonly ResolvedReferenceWithNameDetails[], node: Rule.Node, visitorName: keyof Rule.NodeListener): void {
    const reference = getReferenceByNode(calls, node.parent);
    const prefix: 'mocha' | 'nonMocha' = reference ? 'mocha' : 'nonMocha';
    // @ts-expect-error
    callVisitorIfExists(visitors, `${prefix}${visitorName}`, node);
    // @ts-expect-error
    callVisitorIfExists(visitors, `${visitorName}`, node);
}

const cachedCalls = new Map<string, WeakMap<SourceCode, readonly ResolvedReferenceWithNameDetails[]>>();

// eslint-disable-next-line max-statements -- caching with two cache keys, requires weird dance of statements
function findCallsCached(context: Rule.RuleContext): readonly ResolvedReferenceWithNameDetails[] {
    const settingsCacheKey = `${JSON.stringify(context.settings)}`;
    let callsPerSettings = cachedCalls.get(settingsCacheKey);
    if (callsPerSettings === undefined) {
        callsPerSettings = new WeakMap();
        cachedCalls.set(settingsCacheKey, callsPerSettings);
    }

    const callCacheKey = context.sourceCode;
    let calls = callsPerSettings.get(callCacheKey);
    if (calls === undefined) {
        const additionalCustomNames = getAdditionalNames(context.settings);
        const interfaceToUse = getInterface(context.settings);
        const names = getAllNames(additionalCustomNames);

        calls = findMochaVariableCalls(context, names, interfaceToUse);
        callsPerSettings.set(callCacheKey, calls);
    }

    return calls;
}

export function createMochaVisitors(context: Rule.RuleContext, visitors: MochaVisitors): Rule.RuleListener {
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
        'anyTestEntityCallback:exit': anyTestEntityCallbackExit,
    };
    const calls = findCallsCached(context);

    return {
        ...nonMochaVisitors,

        CallExpression(node) {
            const reference = getReferenceByNode(calls, node);
            if (reference) {
                callVisitors(mochaVisitors, reference);
            } else {
                callVisitorIfExists(mochaVisitors, 'nonMochaCallExpression', node);
            }
            // @ts-expect-error
            callVisitorIfExists(nonMochaVisitors, 'CallExpression', node);
        },

        'CallExpression:exit'(node) {
            const reference = getReferenceByNode(calls, node);
            if (reference) {
                callVisitors(mochaVisitors, reference, ':exit');
            } else {
                callVisitorIfExists(mochaVisitors, 'nonMochaCallExpression:exit', node);
            }
            // @ts-expect-error
            callVisitorIfExists(nonMochaVisitors, 'CallExpression:exit', node);
        },

        MemberExpression(node) {
            processExpression(visitors, calls, node, 'MemberExpression');
        },

        'MemberExpression:exit'(node) {
            processExpression(visitors, calls, node, 'MemberExpression:exit');
        },

        FunctionExpression(node) {
            processExpression(visitors, calls, node, 'FunctionExpression');
        },

        'FunctionExpression:exit'(node) {
            processExpression(visitors, calls, node, 'FunctionExpression:exit');
        }
    };
}
