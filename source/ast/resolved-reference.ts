import type { Rule, Scope, SourceCode } from 'eslint';
import { type DynamicPath, extractMemberExpressionPath } from './member-expression.ts';
import { getParentNode } from './node-types.ts';

export type Reference = {
    readonly node: Rule.Node;
    readonly path: DynamicPath;
};

export type ResolvedReference = {
    readonly node: Rule.Node;
    readonly path: DynamicPath;
    readonly resolvedPath: DynamicPath;
};

function getNextReferenceNode(node: Rule.Node): Rule.Node | null {
    const parent = getParentNode(node);

    if (parent.type === 'MemberExpression') {
        return parent;
    }
    if (parent.type !== 'CallExpression') {
        return null;
    }

    const grandparent = getParentNode(parent);

    return grandparent.type === 'MemberExpression' ? grandparent : null;
}

export function findParentNodeAndPathForIdentifier(sourceCode: SourceCode, node: Rule.Node): Reference {
    let currentNode = node;
    let nextReferenceNode = getNextReferenceNode(currentNode);

    while (nextReferenceNode !== null) {
        currentNode = nextReferenceNode;
        nextReferenceNode = getNextReferenceNode(currentNode);
    }

    return { node: getParentNode(currentNode), path: extractMemberExpressionPath(sourceCode, currentNode) };
}

export function initialReferenceToResolvedReference(
    reference: Scope.Reference,
    sourceCode: SourceCode
): Readonly<ResolvedReference> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- due to the bad typing of eslint core, the type is missing the parent property but it has this property
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node, path, resolvedPath: path };
}
