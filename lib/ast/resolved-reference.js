import { extractMemberExpressionPath } from './member-expression.js';

export function findParentNodeAndPathForIdentifier(sourceCode, node) {
    if (node.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent);
    }
    if (node.parent.type === 'CallExpression' && node.parent.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent.parent);
    }

    return { node: node.parent, path: extractMemberExpressionPath(sourceCode, node) };
}

export function initialReferenceToResolvedReference(sourceCode, reference) {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier);
    return { node, path, resolvedPath: path };
}
