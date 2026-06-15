import type { Rule } from 'eslint';
import type { Except } from 'type-fest';

type NodeType<T extends keyof Rule.NodeListener> = Parameters<Exclude<Rule.NodeListener[T], undefined>>[0];

export type MemberExpression = NodeType<'MemberExpression'>;

export function isMemberExpression(node: Except<Rule.Node, 'parent'>): node is MemberExpression {
    return node.type === 'MemberExpression';
}

export function expectMemberExpression(node: Readonly<Rule.Node>): MemberExpression {
    if (isMemberExpression(node)) {
        return node;
    }

    throw new TypeError(`Expected MemberExpression node, got ${node.type}.`);
}

export type CallExpression = NodeType<'CallExpression'>;

export function isCallExpression(node: Except<Rule.Node, 'parent'>): node is CallExpression {
    return node.type === 'CallExpression';
}

export function expectCallExpression(node: Readonly<Rule.Node>): CallExpression {
    if (isCallExpression(node)) {
        return node;
    }

    throw new TypeError(`Expected CallExpression node, got ${node.type}.`);
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

export type Pattern = Readonly<VariableDeclarator['id']>;
export type ObjectPattern = Extract<Pattern, { readonly type: 'ObjectPattern'; }>;
export type IdentifierPattern = Extract<Pattern, { readonly type: 'Identifier'; }>;

export function isObjectPattern(pattern: Pattern): pattern is ObjectPattern {
    return pattern.type === 'ObjectPattern';
}

export function isIdentifierPattern(pattern: Pattern): pattern is IdentifierPattern {
    return pattern.type === 'Identifier';
}

export type AssignmentProperty = Extract<ObjectPattern['properties'][number], { readonly type: 'Property'; }>;

export function isAssignmentProperty(property: ObjectPattern['properties'][number]): property is AssignmentProperty {
    return property.type === 'Property';
}

type FunctionExpression = NodeType<'FunctionExpression'>;
type FunctionDeclaration = NodeType<'FunctionDeclaration'>;
export type ArrowFunctionExpression = NodeType<'ArrowFunctionExpression'>;

export function isArrowFunctionExpression(node: Except<Rule.Node, 'parent'>): node is ArrowFunctionExpression {
    return node.type === 'ArrowFunctionExpression';
}

function isFunctionExpression(node: Except<Rule.Node, 'parent'>): node is FunctionExpression {
    return node.type === 'FunctionExpression';
}

function isFunctionDeclaration(node: Except<Rule.Node, 'parent'>): node is FunctionDeclaration {
    return node.type === 'FunctionDeclaration';
}

export type AnyFunction = ArrowFunctionExpression | FunctionDeclaration | FunctionExpression;

export function isFunction(node: Except<Rule.Node, 'parent'>): node is AnyFunction {
    return isFunctionExpression(node) || isArrowFunctionExpression(node) || isFunctionDeclaration(node);
}

export type Literal = NodeType<'Literal'>;

export function isLiteral(node: Except<Rule.Node, 'parent'>): node is Literal {
    return node.type === 'Literal';
}

export type Program = NodeType<'Program'>;

export function isProgram(node: Except<Rule.Node, 'parent'>): node is Program {
    return node.type === 'Program';
}

export function getParentNode(node: Rule.Node): Rule.Node {
    if (node.parent === null) {
        throw new Error('Expected node to have a parent.');
    }

    return node.parent;
}
