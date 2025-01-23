import { both, complement, find, isNil, propEq } from 'rambda';

const isDefined = complement(isNil);
const isCallExpression = both(isDefined, propEq('CallExpression', 'type'));

const suiteConfig = new Set(['timeout', 'slow', 'retries']);

function isExplicitUndefined(node) {
    return node && node.type === 'Identifier' && node.name === 'undefined';
}

export function isReturnOfUndefined(node) {
    const { argument } = node;
    const isImplicitUndefined = argument === null;

    return isImplicitUndefined || isExplicitUndefined(argument);
}

export const findReturnStatement = find(propEq('ReturnStatement', 'type'));

function getPropertyName(property) {
    return property.name || property.value;
}

function isSuiteConfigExpression(node) {
    if (node.type !== 'MemberExpression') {
        return false;
    }

    const usingThis = node.object.type === 'ThisExpression';

    if (usingThis) {
        return suiteConfig.has(getPropertyName(node.property));
    }

    return false;
}

export function isSuiteConfigCall(node) {
    return isCallExpression(node) && isSuiteConfigExpression(node.callee);
}
