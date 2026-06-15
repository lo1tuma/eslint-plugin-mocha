import { getStaticValue } from '@eslint-community/eslint-utils';
import type { SourceCode } from 'eslint';
import {
    type CallExpression,
    isCallExpression,
    isFunction,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    type MemberExpression
} from '../ast/node-types.js';
import { type TraversableNode, visitChildNodes } from '../ast/visit-child-nodes.js';
import { configCallNames, type MochaConfigCall } from './descriptors.js';

const suiteConfig = new Set<string>(configCallNames);
const maximumTimeout = Number.parseInt('2147483647', 10);

export type MochaConfigCallExpression = Readonly<CallExpression> & { readonly callee: MemberExpression; };

function isMochaConfigCallName(value: string): value is MochaConfigCall {
    return suiteConfig.has(value);
}

function isFiniteNumber(value: unknown): value is number {
    return Number.isFinite(value);
}

function getNamedConfigPropertyName(property: Readonly<CallExpression['callee']>): MochaConfigCall | null {
    const name = isMemberExpression(property) && !property.computed && isIdentifier(property.property)
        ? property.property.name
        : null;

    return name !== null && isMochaConfigCallName(name) ? name : null;
}

function getComputedConfigPropertyName(property: Readonly<CallExpression['callee']>): MochaConfigCall | null {
    const name = isMemberExpression(property) && property.computed && isLiteral(property.property)
        ? String(property.property.value)
        : null;

    return name !== null && isMochaConfigCallName(name) ? name : null;
}

function getPropertyName(
    property: Readonly<CallExpression['callee']>
): MochaConfigCall | null {
    return getNamedConfigPropertyName(property) ?? getComputedConfigPropertyName(property);
}

function getMochaContextConfigExpression(
    callee: Readonly<CallExpression['callee']>
): Readonly<Extract<CallExpression['callee'], { readonly type: 'MemberExpression'; }>> | null {
    if (!isMemberExpression(callee) || callee.object.type !== 'ThisExpression') {
        return null;
    }

    return getPropertyName(callee) === null
        ? null
        : callee;
}

function getFirstArgument(
    node: Readonly<CallExpression>
): Readonly<CallExpression['arguments'][number]> | undefined {
    const [ firstArgument ] = node.arguments;

    return firstArgument?.type === 'SpreadElement' ? undefined : firstArgument;
}

function isMochaContextConfigCall(
    node: Readonly<TraversableNode>,
    configName?: MochaConfigCall
): node is MochaConfigCallExpression {
    if (!isCallExpression(node)) {
        return false;
    }

    const propertyName = getPropertyName(node.callee);
    const matchingContextExpression = getMochaContextConfigExpression(node.callee);

    return matchingContextExpression !== null &&
        (configName === undefined || propertyName === configName);
}

export function isSuiteConfigCall(node: Readonly<TraversableNode>): boolean {
    return isMochaContextConfigCall(node);
}

export function getStaticNumericConfigValue(
    node: Readonly<CallExpression>,
    sourceCode: Readonly<SourceCode>
): number | null {
    const firstArgument = getFirstArgument(node);

    if (firstArgument === undefined) {
        return null;
    }

    const staticValue = getStaticValue(firstArgument, sourceCode.getScope(firstArgument));
    const value = staticValue?.value;

    return isFiniteNumber(value)
        ? value
        : null;
}

export function isDisabledTimeoutValue(value: number): boolean {
    return value <= 0 || value >= maximumTimeout;
}

export function visitMochaContextConfigCalls(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<TraversableNode>,
    configName: MochaConfigCall,
    visitor: (callExpression: MochaConfigCallExpression) => void
): void {
    if (isMochaContextConfigCall(node, configName)) {
        visitor(node);
    }

    if (isFunction(node) && node.type !== 'ArrowFunctionExpression') {
        return;
    }

    visitChildNodes(sourceCode, node, function (childNode) {
        visitMochaContextConfigCalls(sourceCode, childNode, configName, visitor);
    });
}
