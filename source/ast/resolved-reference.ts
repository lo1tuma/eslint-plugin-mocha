import type { Rule, Scope, SourceCode } from 'eslint';
import { type DynamicPath, extractMemberExpressionPath } from './member-expression.js';
import type { CallExpression } from './node-types.js';

export type Reference = {
    node: CallExpression;
    path: DynamicPath;
};

export type ResolvedReference = {
    node: CallExpression;
    path: DynamicPath;
    resolvedPath: DynamicPath;
};

export function findParentNodeAndPathForIdentifier(sourceCode: SourceCode, node: Rule.Node): Reference {
    if (node.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent);
    }
    if (node.parent.type === 'CallExpression' && node.parent.parent.type === 'MemberExpression') {
        return findParentNodeAndPathForIdentifier(sourceCode, node.parent.parent);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- we know the type of the parent
    return { node: node.parent as CallExpression, path: extractMemberExpressionPath(sourceCode, node) };
}

export function initialReferenceToResolvedReference(
    reference: Scope.Reference,
    sourceCode: SourceCode
): Readonly<ResolvedReference> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- due to the bad typing of eslint core, the type is missing the parent property but it has this property
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node, path, resolvedPath: path };
}
