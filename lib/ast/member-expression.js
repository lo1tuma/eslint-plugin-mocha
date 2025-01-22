/* eslint-disable no-warning-comments -- needed for c8 ignore comments */
import { getStringIfConstant } from '@eslint-community/eslint-utils';

const dynamicMemberSymbol = Symbol('dynamic member access symbol');

function isConstantPathElement(element) {
    return element !== dynamicMemberSymbol;
}

const isCallExpressionCallee = (node) => {
    return node.parent?.type === 'CallExpression' && node.parent.callee === node;
};

function formatName(name, node) {
    if (isConstantPathElement(name)) {
        if (isCallExpressionCallee(node)) {
            return `${name}()`;
        }
        return name;
    }

    return name;
}

function extractPropertyName(memberExpression, sourceCode) {
    if (memberExpression.computed) {
        const constantName = getStringIfConstant(memberExpression.property, sourceCode.getScope(memberExpression));
        return constantName === null ? dynamicMemberSymbol : constantName;
    }
    return memberExpression.property.name;
}

// eslint-disable-next-line max-statements -- no good idea how to split this up
export function extractMemberExpressionPath(sourceCode, node) {
    const path = [];
    let currentNode = node;

    while (currentNode) {
        if (currentNode.type === 'MemberExpression') {
            const propertyName = extractPropertyName(currentNode, sourceCode);
            const formattedProperty = formatName(propertyName, currentNode);
            path.unshift(formattedProperty);
            currentNode = currentNode.object;
        } else if (currentNode.type === 'CallExpression') {
            currentNode = currentNode.callee;
        } else if (currentNode.type === 'Identifier') {
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

export function isConstantPath(path) {
    return path.every(isConstantPathElement);
}
