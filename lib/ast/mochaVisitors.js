import { getAllNames } from '../mocha/all-name-details.js';
import { getAdditionalNames, getInterface } from '../settings.js';
import { findMochaVariableCalls } from './find-mocha-variable-calls.js';

function isSameRange(rangeA, rangeB) {
    return rangeA[0] === rangeB[0] && rangeA[1] === rangeB[1];
}

function isSameNode(nodeA, nodeB) {
    return nodeA.type === nodeB.type && isSameRange(nodeA.range, nodeB.range);
}

function getReferenceByNode(references, node) {
    return references.find((reference) => {
        return isSameNode(reference.node, node);
    });
}

function callVisitorIfExists(visitors, name, context) {
    const visitor = visitors[name];
    if (typeof visitor === 'function') {
        visitor(context);
    }
}

function isAnyFunctionExpression(node) {
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function callVisitorsForTestEntityCallback(visitors, name, context) {
    const lastArgument = context.node.arguments.at(-1);
    if (lastArgument && isAnyFunctionExpression(lastArgument)) {
        callVisitorIfExists(visitors, `${name}`, { ...context, node: lastArgument });
    }
}

function createContext(reference) {
    return {
        name: reference.resolvedPath.join('.'),
        node: reference.node,
        type: reference.nameDetails.type,
        modifier: reference.nameDetails.modifier,
        interface: reference.nameDetails.interface
    };
}

// eslint-disable-next-line max-statements -- now good idea to split this up
function callVisitors(visitors, reference, stageSuffix = '') {
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

function processExpression(visitors, calls, node, visitorName) {
    const reference = getReferenceByNode(calls, node.parent);
    const prefix = reference ? 'mocha' : 'nonMocha';
    callVisitorIfExists(visitors, `${prefix}${visitorName}`, node);
    callVisitorIfExists(visitors, `${visitorName}`, node);
}

const cachedCalls = new Map();

// eslint-disable-next-line max-statements -- caching with two cache keys, requires weird dance of statements
function findCallsCached(context) {
    const settingsCacheKey = `${JSON.stringify(context.settings)}`;
    if (!cachedCalls.has(settingsCacheKey)) {
        cachedCalls.set(settingsCacheKey, new WeakMap());
    }

    const callsPerSettings = cachedCalls.get(settingsCacheKey);
    const callCacheKey = context.sourceCode;
    if (!callsPerSettings.has(callCacheKey)) {
        const additionalCustomNames = getAdditionalNames(context.settings);
        const interfaceToUse = getInterface(context.settings);
        const names = getAllNames(additionalCustomNames);
        const calls = findMochaVariableCalls(context, names, interfaceToUse);
        callsPerSettings.set(callCacheKey, calls);
    }

    return callsPerSettings.get(callCacheKey);
}

export function createMochaVisitors(context, visitors) {
    const calls = findCallsCached(context);

    return {
        ...visitors,

        CallExpression(node) {
            const reference = getReferenceByNode(calls, node);
            if (reference) {
                callVisitors(visitors, reference);
            } else {
                callVisitorIfExists(visitors, 'nonMochaCallExpression', node);
            }
            callVisitorIfExists(visitors, 'CallExpression', node);
        },

        'CallExpression:exit'(node) {
            const reference = getReferenceByNode(calls, node);
            if (reference) {
                callVisitors(visitors, reference, ':exit');
            } else {
                callVisitorIfExists(visitors, 'nonMochaCallExpression:exit', node);
            }
            callVisitorIfExists(visitors, 'CallExpression:exit', node);
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
