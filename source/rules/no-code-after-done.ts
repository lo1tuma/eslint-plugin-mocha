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
): boolean {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        findVariable(sourceCode.getScope(asRuleNode(node.callee)), node.callee.name) === doneCallbackVariable;
}

function statementContainsDoneCallbackCall(
    sourceCode: Readonly<SourceCode>,
    statement: Readonly<Statement>,
    doneCallbackVariable: Readonly<Scope.Variable>
): boolean {
    let containsDoneCallbackCall = false;

    visitWithoutNestedFunctions(sourceCode, statement, (childNode) => {
        if (isDoneCallbackCall(sourceCode, childNode, doneCallbackVariable)) {
            containsDoneCallbackCall = true;
        }
    });

    return containsDoneCallbackCall;
}

function isFlowExitStatement(statement: Readonly<Statement>): boolean {
    return statement.type === 'ReturnStatement' ||
        statement.type === 'ThrowStatement' ||
        statement.type === 'BreakStatement' ||
        statement.type === 'ContinueStatement';
}

function isExecutableStatement(statement: Readonly<Statement>): boolean {
    return statement.type !== 'FunctionDeclaration';
}

function shouldReportFollowingStatement(statement: Readonly<Statement>): boolean {
    return !isFlowExitStatement(statement) && isExecutableStatement(statement);
}

function reportFollowingStatementIfNeeded(
    context: Readonly<Rule.RuleContext>,
    statement: Readonly<Statement>,
    shouldReportNextExecutableStatement: boolean
): void {
    if (!shouldReportNextExecutableStatement) {
        return;
    }

    if (shouldReportFollowingStatement(statement)) {
        context.report({
            node: statement,
            messageId: 'unexpectedCodeAfterDone'
        });
    }
}

function shouldStartTrackingFollowingStatement(
    sourceCode: Readonly<SourceCode>,
    statement: Readonly<Statement>,
    doneCallbackVariable: Readonly<Scope.Variable>
): boolean {
    return statementContainsDoneCallbackCall(
        sourceCode,
        statement,
        doneCallbackVariable
    ) && !isFlowExitStatement(statement);
}

function inspectBlockStatements(
    context: Readonly<Rule.RuleContext>,
    blockStatement: Readonly<BlockStatement>,
    doneCallbackVariable: Readonly<Scope.Variable>
): void {
    let shouldReportNextExecutableStatement = false;

    for (const statement of blockStatement.body) {
        reportFollowingStatementIfNeeded(context, statement, shouldReportNextExecutableStatement);
        if (shouldReportNextExecutableStatement) {
            shouldReportNextExecutableStatement = false;
        }
        shouldReportNextExecutableStatement = shouldStartTrackingFollowingStatement(
            context.sourceCode,
            statement,
            doneCallbackVariable
        ) || shouldReportNextExecutableStatement;
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

export function checkNodeForCodeAfterDone(context: Readonly<Rule.RuleContext>, node: Readonly<Rule.Node>): void {
    if (!isFunction(node)) {
        return;
    }

    const doneCallbackVariable = getDoneCallbackVariable(context.sourceCode, node);

    if (doneCallbackVariable === undefined || doneCallbackVariable === null) {
        return;
    }

    inspectNodeRecursively(context, node.body, doneCallbackVariable);
}

export const noCodeAfterDoneRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow executing code after calling a Mocha callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-code-after-done.md'
        },
        messages: {
            unexpectedCodeAfterDone: 'Do not execute code after calling the Mocha callback'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                checkNodeForCodeAfterDone(context, visitorContext.node);
            }
        });
    }
};
