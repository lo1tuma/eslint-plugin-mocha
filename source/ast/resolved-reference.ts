import { extractMemberExpressionPath, type DynamicPath } from './member-expression.js';
import {type  Rule, type SourceCode, type Scope } from 'eslint';
import { type CallExpression } from './node-types.js';


export type Reference = {
    node: CallExpression,
    path: DynamicPath;
}

export type ResolvedReference = {
    node: CallExpression,
    path: DynamicPath
    resolvedPath: DynamicPath
}

export function findParentNodeAndPathForIdentifier(sourceCode: SourceCode, node: Rule.Node): Reference {
    if (node.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent);
    }
    if (node.parent.type === 'CallExpression' && node.parent.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent.parent);
    }

    return { node: node.parent as CallExpression, path: extractMemberExpressionPath(sourceCode, node) };
}

export function initialReferenceToResolvedReference(reference: Scope.Reference, sourceCode: SourceCode): ResolvedReference  {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node: node as CallExpression, path, resolvedPath: path };
}
