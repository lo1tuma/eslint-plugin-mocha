import type { Rule } from 'eslint';
import type { Except } from 'type-fest';

type NodeType<T extends keyof Rule.NodeListener> = Parameters<Exclude<Rule.NodeListener[T], undefined>>[0];

export type MemberExpression = NodeType<'MemberExpression'>;

export function isMemberExpression(node: Except<Rule.Node, 'parent'>): node is MemberExpression {
    return node.type === 'MemberExpression';
}

export type CallExpression = NodeType<'CallExpression'>;

export function isCallExpression(node: Except<Rule.Node, 'parent'>): node is CallExpression {
    return node.type === 'CallExpression';
}

export type BlockStatement = NodeType<'BlockStatement'>;

export function isBlockStatement(node: Except<Rule.Node, 'parent'>): node is BlockStatement {
    return node.type === 'BlockStatement';
}

export type ReturnStatement = NodeType<'ReturnStatement'>;

export function isReturnStatement(node: Except<Rule.Node, 'parent'>): node is ReturnStatement {
    return node.type === 'ReturnStatement';
}

export type Identifier = NodeType<'Identifier'>;

export function isIdentifier(node: Except<Rule.Node, 'parent'>): node is Identifier {
    return node.type === 'Identifier';
}

export type VariableDeclarator = NodeType<'VariableDeclarator'>;

export function isVariableDeclarator(node: Rule.Node): node is VariableDeclarator {
    return node.type === 'VariableDeclarator';
}

export type Pattern = VariableDeclarator['id'];
export type ObjectPattern = Extract<Pattern, { type: 'ObjectPattern'; }>;
export type IdentifierPattern = Extract<Pattern, { type: 'Identifier'; }>;

export function isObjectPattern(pattern: Pattern): pattern is ObjectPattern {
    return pattern.type === 'ObjectPattern';
}

export function isIdentifierPattern(pattern: Pattern): pattern is IdentifierPattern {
    return pattern.type === 'Identifier';
}

export type AssignmentProperty = Extract<ObjectPattern['properties'][number], { type: 'Property'; }>;

export function isAssignmentProperty(property: ObjectPattern['properties'][number]): property is AssignmentProperty {
    return property.type === 'Property';
}

export type FunctionExpression = NodeType<'FunctionExpression'>;
export type FunctionDeclaration = NodeType<'FunctionDeclaration'>;
export type ArrowFunctionExpression = NodeType<'ArrowFunctionExpression'>;

export function isArrowFunctionExpression(node: Except<Rule.Node, 'parent'>): node is ArrowFunctionExpression {
    return node.type === 'ArrowFunctionExpression';
}

export function isFunctionExpression(node: Except<Rule.Node, 'parent'>): node is FunctionExpression {
    return node.type === 'FunctionExpression';
}

export function isFunctionDeclaration(node: Except<Rule.Node, 'parent'>): node is FunctionDeclaration {
    return node.type === 'FunctionDeclaration';
}

export type AnyFunction = ArrowFunctionExpression | FunctionDeclaration | FunctionExpression;

export function isFunction(node: Except<Rule.Node, 'parent'>): node is AnyFunction {
    return isFunctionExpression(node) || isArrowFunctionExpression(node) || isFunctionDeclaration(node);
}

export type MetaProperty = NodeType<'MetaProperty'>;

export type Literal = NodeType<'Literal'>;

export function isLiteral(node: Except<Rule.Node, 'parent'>): node is Literal {
    return node.type === 'Literal';
}
