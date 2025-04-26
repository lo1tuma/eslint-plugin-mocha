/* eslint-disable no-warning-comments -- needed for c8 ignore comments */
import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { isCallExpression, isIdentifier, isMemberExpression, type MemberExpression } from './node-types.js';

const dynamicMemberSymbol = Symbol('dynamic member access symbol');

type DynamicPathSegment = string | symbol;

export type DynamicPath = readonly DynamicPathSegment[];
export type ConstantPath = readonly string[];

function isConstantPathElement(element: string | symbol): element is string {
    return element !== dynamicMemberSymbol;
}

function isCallExpressionCallee(node: Readonly<Rule.Node>): boolean {
    return node.parent.type === 'CallExpression' && node.parent.callee === node;
}

function formatName(name: string | symbol, node: Readonly<Rule.Node>): DynamicPathSegment {
    if (isConstantPathElement(name)) {
        if (isCallExpressionCallee(node)) {
            return `${name}()`;
        }
        return name;
    }

    return name;
}

export function getIdentifierName(node: Except<Rule.Node, 'parent'>): DynamicPathSegment {
    if (isIdentifier(node)) {
        return node.name;
    }
    return dynamicMemberSymbol;
}

function extractPropertyName(
    memberExpression: Readonly<MemberExpression>,
    sourceCode: Readonly<SourceCode>
): string | symbol {
    if (memberExpression.computed) {
        const constantName = getStringIfConstant(memberExpression.property, sourceCode.getScope(memberExpression));
        return constantName ?? dynamicMemberSymbol;
    }
    return getIdentifierName(memberExpression.property);
}

// eslint-disable-next-line max-statements -- no good idea how to split this up
export function extractMemberExpressionPath(sourceCode: Readonly<SourceCode>, node: Readonly<Rule.Node>): DynamicPath {
    const path = [];
    let currentNode: Rule.Node | null = node;

    while (currentNode !== null) {
        if (isMemberExpression(currentNode)) {
            const propertyName = extractPropertyName(currentNode, sourceCode);
            const formattedProperty = formatName(propertyName, currentNode);
            path.unshift(formattedProperty);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typing in eslint core
            currentNode = currentNode.object as (Rule.Node | null);
        } else if (isCallExpression(currentNode)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typing in eslint core
            currentNode = currentNode.callee as (Rule.Node | null);
        } else if (isIdentifier(currentNode)) {
            const formattedName = formatName(currentNode.name, currentNode);
            path.unshift(formattedName);
            return path;
            /* c8 ignore next */
        } else {
            /* c8 ignore next */
            return path;
            /* c8 ignore next */
        }
    }
    /* c8 ignore next */
    return path;
}

export function isConstantPath(path: readonly (string | symbol)[]): path is ConstantPath {
    return path.every(isConstantPathElement);
}
