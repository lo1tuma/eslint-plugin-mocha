import type { Rule, Scope, SourceCode } from 'eslint';
import { type DynamicPath, extractMemberExpressionPath } from './member-expression.js';
import { getParentNode } from './node-types.js';

export type Reference = {
    readonly node: Rule.Node;
    readonly path: DynamicPath;
};

export type ResolvedReference = {
    readonly node: Rule.Node;
    readonly path: DynamicPath;
    readonly resolvedPath: DynamicPath;
};

export function findParentNodeAndPathForIdentifier(sourceCode: SourceCode, node: Rule.Node): Reference {
    const parent = getParentNode(node);

    if (parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, parent);
    }
    if (parent.type === 'CallExpression') {
        const grandparent = getParentNode(parent);

        if (grandparent.type === 'MemberExpression') {
            return findParentNodeAndPathForIdentifier(sourceCode, grandparent);
        }
    }

    return { node: parent, path: extractMemberExpressionPath(sourceCode, node) };
}

export function initialReferenceToResolvedReference(
    reference: Scope.Reference,
    sourceCode: SourceCode
): Readonly<ResolvedReference> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- due to the bad typing of eslint core, the type is missing the parent property but it has this property
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node, path, resolvedPath: path };
}
