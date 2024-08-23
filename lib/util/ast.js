import { both, complement, find, isNil, pathEq, propEq } from 'rambda';
import { getSuiteNames, getTestCaseNames } from './names.js';
import { getAdditionalNames } from './settings.js';

const isDefined = complement(isNil);
const isCallExpression = both(isDefined, propEq('CallExpression', 'type'));

const hooks = new Set([
    'before',
    'after',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
    'setup',
    'teardown',
    'suiteSetup',
    'suiteTeardown'
]);
const suiteConfig = new Set(['timeout', 'slow', 'retries']);

const findReturnStatement = find(propEq('ReturnStatement', 'type'));

function getPropertyName(property) {
    return property.name || property.value;
}

function getNodeName(node) {
    if (node.type === 'ThisExpression') {
        return 'this';
    }
    if (node.type === 'CallExpression') {
        return `${getNodeName(node.callee)}()`;
    }
    if (node.type === 'MemberExpression') {
        return `${getNodeName(node.object)}.${getPropertyName(node.property)}`;
    }
    return node.name;
}

function isHookIdentifier(node) {
    return node && node.type === 'Identifier' && hooks.has(node.name);
}

function isHookCall(node) {
    return isCallExpression(node) && isHookIdentifier(node.callee);
}

function findReference(scope, node) {
    const hasSameRangeAsNode = pathEq(['identifier', 'range'], node.range);

    return find(hasSameRangeAsNode, scope.references);
}

function isShadowed(scope, identifier) {
    const reference = findReference(scope, identifier);

    return (
        reference && reference.resolved && reference.resolved.defs.length > 0
    );
}

function isCallToShadowedReference(node, scope) {
    const identifier = node.callee.type === 'MemberExpression'
        ? node.callee.object
        : node.callee;

    return isShadowed(scope, identifier);
}

function isFunctionCallWithName(node, names) {
    return isCallExpression(node) && names.includes(getNodeName(node.callee));
}

// eslint-disable-next-line max-statements -- this needs to be refactored to reduce complexity
export function createAstUtils(settings) {
    const additionalCustomNames = getAdditionalNames(settings);

    function buildIsDescribeAnswerer(options = {}) {
        const { modifiers = ['skip', 'only'], modifiersOnly = false } = options;
        const describeAliases = getSuiteNames({
            modifiersOnly,
            modifiers,
            additionalCustomNames
        });

        return (node) => {
            return isFunctionCallWithName(node, describeAliases);
        };
    }

    function isDescribe(node, options = {}) {
        return buildIsDescribeAnswerer(options)(node);
    }

    function buildIsTestCaseAnswerer(options = {}) {
        const { modifiers = ['skip', 'only'], modifiersOnly = false } = options;
        const testCaseNames = getTestCaseNames({
            modifiersOnly,
            modifiers,
            additionalCustomNames
        });

        return (node) => {
            return isFunctionCallWithName(node, testCaseNames);
        };
    }

    function isTestCase(node, options = {}) {
        return buildIsTestCaseAnswerer(options)(node);
    }

    function isSuiteConfigExpression(node) {
        if (node.type !== 'MemberExpression') {
            return false;
        }

        const usingThis = node.object.type === 'ThisExpression';

        if (usingThis || isTestCase(node.object)) {
            return suiteConfig.has(getPropertyName(node.property));
        }

        return false;
    }

    function isSuiteConfigCall(node) {
        return isCallExpression(node) && isSuiteConfigExpression(node.callee);
    }

    function buildIsMochaFunctionCallAnswerer(_isTestCase, _isDescribe) {
        function isMochaFunctionCall(node) {
            return _isTestCase(node) || _isDescribe(node) || isHookCall(node);
        }

        return (node, context) => {
            if (isMochaFunctionCall(node)) {
                const scope = context.sourceCode.getScope(node);

                if (!isCallToShadowedReference(node, scope)) {
                    return true;
                }
            }

            return false;
        };
    }

    function hasParentMochaFunctionCall(functionExpression, options) {
        return (
            isTestCase(functionExpression.parent, options) ||
            isHookCall(functionExpression.parent)
        );
    }

    function isExplicitUndefined(node) {
        return node && node.type === 'Identifier' && node.name === 'undefined';
    }

    function isReturnOfUndefined(node) {
        const { argument } = node;
        const isImplicitUndefined = argument === null;

        return isImplicitUndefined || isExplicitUndefined(argument);
    }

    return {
        isDescribe,
        isHookIdentifier,
        isTestCase,
        getPropertyName,
        getNodeName,
        isHookCall,
        isSuiteConfigCall,
        hasParentMochaFunctionCall,
        findReturnStatement,
        isReturnOfUndefined,
        buildIsDescribeAnswerer,
        buildIsTestCaseAnswerer,
        buildIsMochaFunctionCallAnswerer
    };
}
