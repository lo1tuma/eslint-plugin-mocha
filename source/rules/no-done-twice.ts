import { findVariable } from '@eslint-community/eslint-utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import {
    type AnyFunction,
    type BlockStatement,
    isBlockStatement,
    isFunction,
    isIdentifier
} from '../ast/node-types.js';
import { asRuleNode } from '../done-callback-paths.js';

type TraversableNode = Except<Rule.Node, 'parent'>;
type Statement = BlockStatement['body'][number];
type CallExpression = Extract<TraversableNode, { type: 'CallExpression'; }>;

function isTypeScriptThisParameter(param: AnyFunction['params'][number] | undefined): boolean {
    return param !== undefined && isIdentifier(param) && param.name === 'this';
}

function getFirstMeaningfulParameter(node: Readonly<AnyFunction>): AnyFunction['params'][number] | undefined {
    const [firstParam, secondParam] = node.params;
    return isTypeScriptThisParameter(firstParam) ? secondParam : firstParam;
}

function getDoneCallbackVariable(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<AnyFunction>
): Readonly<Scope.Variable | null | undefined> {
    const callbackParameter = getFirstMeaningfulParameter(node);

    if (callbackParameter?.type !== 'Identifier') {
        return undefined;
    }

    return findVariable(sourceCode.getScope(asRuleNode(callbackParameter)), callbackParameter.name);
}

function getNodeProperty(node: TraversableNode, key: string): unknown {
    return Reflect.get(node, key);
}

function isNode(value: unknown): value is TraversableNode {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function visitChildNodes(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (childNode: TraversableNode) => void
): void {
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
        const value = getNodeProperty(node, key);

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (isNode(item)) {
                    visitor(item);
                }
            });
        } else if (isNode(value)) {
            visitor(value);
        }
    }
}

function visitWithoutNestedFunctions(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (childNode: TraversableNode) => void
): void {
    visitor(node);

    if (isFunction(node)) {
        return;
    }

    visitChildNodes(sourceCode, node, (childNode) => {
        visitWithoutNestedFunctions(sourceCode, childNode, visitor);
    });
}

function isDoneCallbackCall(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    doneCallbackVariable: Readonly<Scope.Variable>
): node is CallExpression {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        findVariable(sourceCode.getScope(asRuleNode(node.callee)), node.callee.name) === doneCallbackVariable;
}

function collectDoneCallbackCalls(
    sourceCode: Readonly<SourceCode>,
    statement: Readonly<Statement>,
    doneCallbackVariable: Readonly<Scope.Variable>
): readonly Readonly<CallExpression>[] {
    const doneCallbackCalls: CallExpression[] = [];

    visitWithoutNestedFunctions(sourceCode, statement, (childNode) => {
        if (isDoneCallbackCall(sourceCode, childNode, doneCallbackVariable)) {
            doneCallbackCalls.push(childNode);
        }
    });

    return doneCallbackCalls;
}

function isFlowExitStatement(statement: Readonly<Statement>): boolean {
    return statement.type === 'ReturnStatement' ||
        statement.type === 'ThrowStatement' ||
        statement.type === 'BreakStatement' ||
        statement.type === 'ContinueStatement';
}

function reportDoneCallbackCall(context: Readonly<Rule.RuleContext>, callExpression: Readonly<CallExpression>): void {
    context.report({
        node: callExpression,
        messageId: 'unexpectedDoneTwice'
    });
}

function findRepeatedDoneCallbackCall(
    doneCallbackCalls: readonly Readonly<CallExpression>[],
    seenDoneCallbackCall: boolean
): Readonly<CallExpression | undefined> {
    const [firstDoneCallbackCall, secondDoneCallbackCall] = doneCallbackCalls;

    if (secondDoneCallbackCall !== undefined) {
        return secondDoneCallbackCall;
    }

    return seenDoneCallbackCall ? firstDoneCallbackCall : undefined;
}

function shouldRememberDoneCallbackCall(
    statement: Readonly<Statement>,
    firstDoneCallbackCall: Readonly<CallExpression | undefined>
): boolean {
    return firstDoneCallbackCall !== undefined && !isFlowExitStatement(statement);
}

function getSeenDoneCallbackCall(
    statement: Readonly<Statement>,
    firstDoneCallbackCall: Readonly<CallExpression | undefined>,
    seenDoneCallbackCall: boolean
): boolean {
    if (isFlowExitStatement(statement)) {
        return false;
    }

    return shouldRememberDoneCallbackCall(statement, firstDoneCallbackCall) || seenDoneCallbackCall;
}

function inspectBlockStatements(
    context: Readonly<Rule.RuleContext>,
    blockStatement: Readonly<BlockStatement>,
    doneCallbackVariable: Readonly<Scope.Variable>
): void {
    let seenDoneCallbackCall = false;

    for (const statement of blockStatement.body) {
        const doneCallbackCalls = collectDoneCallbackCalls(context.sourceCode, statement, doneCallbackVariable);
        const [firstDoneCallbackCall] = doneCallbackCalls;
        const repeatedDoneCallbackCall = findRepeatedDoneCallbackCall(doneCallbackCalls, seenDoneCallbackCall);

        if (repeatedDoneCallbackCall !== undefined) {
            reportDoneCallbackCall(context, repeatedDoneCallbackCall);
        }

        seenDoneCallbackCall = getSeenDoneCallbackCall(statement, firstDoneCallbackCall, seenDoneCallbackCall);
    }
}

function inspectNodeRecursively(
    context: Readonly<Rule.RuleContext>,
    node: TraversableNode,
    doneCallbackVariable: Readonly<Scope.Variable>
): void {
    if (isBlockStatement(node)) {
        inspectBlockStatements(context, node, doneCallbackVariable);
    }

    visitChildNodes(context.sourceCode, node, (childNode) => {
        inspectNodeRecursively(context, childNode, doneCallbackVariable);
    });
}

export function checkNodeForDoneTwice(context: Readonly<Rule.RuleContext>, node: Readonly<Rule.Node>): void {
    if (!isFunction(node)) {
        return;
    }

    const doneCallbackVariable = getDoneCallbackVariable(context.sourceCode, node);

    if (doneCallbackVariable === undefined || doneCallbackVariable === null) {
        return;
    }

    inspectNodeRecursively(context, node.body, doneCallbackVariable);
}

export const noDoneTwiceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow calling a Mocha callback more than once',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-done-twice.md'
        },
        messages: {
            unexpectedDoneTwice: 'Do not call the Mocha callback more than once'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                checkNodeForDoneTwice(context, visitorContext.node);
            }
        });
    }
};
