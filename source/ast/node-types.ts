import {type  Rule } from 'eslint';

type NodeType<T extends keyof Rule.NodeListener> = Parameters<Exclude<Rule.NodeListener[T], undefined>>[0]

export type MemberExpression = NodeType<'MemberExpression'>;

export function isMemberExpression(node: Omit<Rule.Node, 'parent'>): node is MemberExpression {
    return node.type === 'MemberExpression';
}

export type CallExpression = NodeType<'CallExpression'>;

export function isCallExpression(node: Omit<Rule.Node, 'parent'>): node is CallExpression {
    return node.type === 'CallExpression';
}

export type Identifier = NodeType<'Identifier'>

export function isIdentifier(node: Omit<Rule.Node, 'parent'>): node is Identifier {
    return node.type === 'Identifier';
}

export type VariableDeclarator = NodeType<'VariableDeclarator'>

export function isVariableDeclarator(node: Rule.Node): node is VariableDeclarator {
    return node.type === 'VariableDeclarator';
}

export type Pattern = VariableDeclarator['id'];
export type ObjectPattern = Extract<Pattern, { type: 'ObjectPattern'}>
export type IdentifierPattern = Extract<Pattern, { type: 'Identifier'}>

export function isObjectPattern(pattern: Pattern): pattern is ObjectPattern {
    return pattern.type === 'ObjectPattern';
}

export function isIdentifierPattern(pattern: Pattern): pattern is IdentifierPattern {
    return pattern.type === 'Identifier';
}

export type AssignmentProperty = Extract<ObjectPattern['properties'][number], { type: 'Property' }>;

export function isAssignmentProperty(property: ObjectPattern['properties'][number]): property is AssignmentProperty {
    return property.type === 'Property';
}
