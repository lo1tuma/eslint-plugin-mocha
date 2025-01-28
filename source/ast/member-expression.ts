/* eslint-disable no-warning-comments -- needed for c8 ignore comments */
import { getStringIfConstant } from '@eslint-community/eslint-utils';
import {type  Rule, type SourceCode } from 'eslint';
import { type MemberExpression, isCallExpression, isIdentifier, isMemberExpression } from './node-types.js';



const dynamicMemberSymbol = Symbol('dynamic member access symbol');

type DynamicPathSegment = string | Symbol;

export type DynamicPath = readonly DynamicPathSegment[];
export type ConstantPath = readonly string[];

function isConstantPathElement(element: string | Symbol): element is string {
    return element !== dynamicMemberSymbol;
}

function isCallExpressionCallee(node: Rule.Node): boolean  {
    return node.parent?.type === 'CallExpression' && node.parent.callee === node;
};

function formatName(name: string | Symbol, node: Rule.Node): DynamicPathSegment {
    if (isConstantPathElement(name)) {
        if (isCallExpressionCallee(node)) {
            return `${name}()`;
        }
        return name;
    }

    return name;
}

export function getIdentifierName(node: Omit<Rule.Node, 'parent'>): DynamicPathSegment {
    if (isIdentifier(node)) {
        return node.name;
    }
    return dynamicMemberSymbol;
}

function extractPropertyName(memberExpression: MemberExpression, sourceCode: SourceCode): string | Symbol {
    if (memberExpression.computed) {
        const constantName = getStringIfConstant(memberExpression.property, sourceCode.getScope(memberExpression));
        return constantName === null ? dynamicMemberSymbol : constantName;
    }
    return getIdentifierName(memberExpression.property);
}

// eslint-disable-next-line max-statements -- no good idea how to split this up
export function extractMemberExpressionPath(sourceCode: SourceCode, node: Rule.Node): DynamicPath{
    const path = [];
    let currentNode: Rule.Node = node;

    while (currentNode) {
        if (isMemberExpression(currentNode)) {
            const propertyName = extractPropertyName(currentNode, sourceCode);
            const formattedProperty = formatName(propertyName, currentNode);
            path.unshift(formattedProperty);
            currentNode = currentNode.object as Rule.Node;
        } else if (isCallExpression(currentNode)) {
            currentNode = currentNode.callee as Rule.Node;
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

export function isConstantPath(path: readonly (string|Symbol)[]): path is ConstantPath {
    return path.every(isConstantPathElement);
}
