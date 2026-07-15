import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import {
    getParentNode,
    isCallExpression,
    isIdentifier,
    isMemberExpression,
    type MemberExpression
} from './node-types.ts';

const dynamicMemberSymbol = Symbol('dynamic member access symbol');

type DynamicPathSegment = string | symbol;

export type DynamicPath = readonly DynamicPathSegment[];
export type ConstantPath = readonly string[];

function isConstantPathElement(element: string | symbol): element is string {
    return element !== dynamicMemberSymbol;
}

function isCallExpressionCallee(node: Readonly<Rule.Node>): boolean {
    const parent = getParentNode(node);

    return parent.type === 'CallExpression' && Object.is(parent.callee, node);
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

export function extractMemberExpressionPath(sourceCode: Readonly<SourceCode>, node: Readonly<Rule.Node>): DynamicPath {
    const path: DynamicPathSegment[] = [];

    function appendPathSegment(currentNode: Readonly<Rule.Node> | null): void {
        if (currentNode !== null) {
            if (isMemberExpression(currentNode)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typing in eslint core
                appendPathSegment(currentNode.object as Rule.Node);

                const propertyName = extractPropertyName(currentNode, sourceCode);
                path.push(formatName(propertyName, currentNode));
            } else if (isCallExpression(currentNode)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typing in eslint core
                appendPathSegment(currentNode.callee as Rule.Node);
            } else if (isIdentifier(currentNode)) {
                path.push(formatName(currentNode.name, currentNode));
            }
        }
    }

    appendPathSegment(node);

    return path;
}

export function isConstantPath(path: readonly (string | symbol)[]): path is ConstantPath {
    return path.every(isConstantPathElement);
}
