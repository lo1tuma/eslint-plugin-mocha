import type { Rule, SourceCode } from 'eslint';
import type { Comment as EstreeComment } from 'estree';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { expectNodeRange } from '../ast/node-location.js';
import {
    type AnyFunction,
    expectCallExpression,
    getParentNode,
    isFunction,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    type MemberExpression
} from '../ast/node-types.js';
import { asRuleNode } from '../ast/rule-node.js';
import { type TraversableNode, visitChildNodes } from '../ast/visit-child-nodes.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
    type: 'object',
    properties: {
        allowSkippedWithComment: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { allowSkippedWithComment: boolean; };
type PendingRuleConfiguration = {
    readonly allowSkippedWithComment: boolean;
};
type CallExpression = Extract<TraversableNode, { type: 'CallExpression'; }>;

const defaultOption: ResolvedOption = {
    allowSkippedWithComment: false
};

type PendingMemberCallee = Extract<CallExpression['callee'], { type: 'MemberExpression'; }>;
type Locatable = {
    readonly loc?:
        | {
            readonly start: { readonly line: number; };
            readonly end: { readonly line: number; };
        }
        | null
        | undefined;
};
type KnownLocation = Locatable & {
    readonly loc: NonNullable<Locatable['loc']>;
};
type KnownLocationComment = EstreeComment & KnownLocation;

function isCallbackMissing(node: CallExpression): boolean {
    const [firstArgument] = node.arguments;
    return firstArgument !== undefined && firstArgument.type === 'Literal' && node.arguments.length === 1;
}

function isNamedSkipProperty(property: Readonly<MemberExpression['property']>): boolean {
    return isIdentifier(property) && property.name === 'skip';
}

function isLiteralSkipProperty(property: Readonly<MemberExpression['property']>): boolean {
    return isLiteral(property) && property.value === 'skip';
}

function isPendingMemberExpression(
    callee: Readonly<CallExpression['callee']>
): callee is Extract<CallExpression['callee'], { type: 'MemberExpression'; }> {
    if (!isMemberExpression(callee)) {
        return false;
    }

    const { property } = callee;

    return (!callee.computed && isNamedSkipProperty(property)) ||
        (callee.computed && isLiteralSkipProperty(property));
}

function isThisSkipMemberExpression(
    callee: Readonly<CallExpression['callee']>
): callee is Extract<CallExpression['callee'], { type: 'MemberExpression'; }> {
    return isPendingMemberExpression(callee) && callee.object.type === 'ThisExpression';
}

function isThisSkipCall(node: Readonly<CallExpression>): boolean {
    return isThisSkipMemberExpression(node.callee);
}

function fixPendingMemberExpression(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    callee: Readonly<PendingMemberCallee>
): Readonly<Rule.Fix | null> {
    const { object } = callee;
    const range = expectNodeRange(callee);

    return fixer.replaceTextRange(range, sourceCode.getText(object));
}

function fixPendingTest(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    node: Readonly<CallExpression>
): Readonly<Rule.Fix | null> {
    if (isIdentifier(node.callee)) {
        return fixer.replaceText(node.callee, node.callee.name.slice(1));
    }

    if (isPendingMemberExpression(node.callee)) {
        return fixPendingMemberExpression(fixer, sourceCode, node.callee);
    }

    return null;
}

function hasKnownLocation(
    value: Locatable
): value is KnownLocation {
    return value.loc !== undefined && value.loc !== null;
}

function isAdjacentToComment(comment: EstreeComment, node: Readonly<Rule.Node>): boolean {
    return hasKnownLocation(comment) &&
        hasKnownLocation(node) &&
        node.loc.start.line - comment.loc.end.line <= 1;
}

function isStandaloneLeadingComment(sourceCode: Readonly<SourceCode>, comment: KnownLocationComment): boolean {
    const tokenBeforeComment = sourceCode.getTokenBefore(comment, { includeComments: true });

    return tokenBeforeComment === null ||
        !hasKnownLocation(tokenBeforeComment) ||
        tokenBeforeComment.loc.end.line < comment.loc.start.line;
}

function hasAdjacentLeadingComment(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>
): boolean {
    const lastComment = sourceCode.getCommentsBefore(node).at(-1);

    return lastComment !== undefined &&
        hasKnownLocation(lastComment) &&
        isAdjacentToComment(lastComment, node) &&
        isStandaloneLeadingComment(sourceCode, lastComment);
}

function shouldAllowSkippedWithComment(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<CallExpression>,
    configuration: Readonly<PendingRuleConfiguration>
): boolean {
    return configuration.allowSkippedWithComment &&
        hasAdjacentLeadingComment(context.sourceCode, asRuleNode(node));
}

function canRemovePendingModifier(node: Readonly<CallExpression>): boolean {
    return isIdentifier(node.callee) ||
        (isPendingMemberExpression(node.callee) && !isThisSkipMemberExpression(node.callee));
}

function visitThisSkipCalls(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (callExpression: Readonly<CallExpression>) => void
): void {
    if (node.type === 'CallExpression' && isThisSkipCall(node)) {
        visitor(node);
    }

    if (isFunction(node) && node.type !== 'ArrowFunctionExpression') {
        return;
    }

    visitChildNodes(sourceCode, node, (childNode) => {
        visitThisSkipCalls(sourceCode, childNode, visitor);
    });
}

function reportSkipped(
    context: Readonly<Rule.RuleContext>,
    node: CallExpression,
    messageId: 'unexpectedPendingTest' | 'unexpectedSkippedTestWithoutComment'
): void {
    const nodeToReport = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;

    context.report({
        node: nodeToReport,
        messageId,
        ...(canRemovePendingModifier(node)
            ? {
                suggest: [{
                    messageId: 'removePendingModifier' as const,
                    fix(fixer: Rule.RuleFixer) {
                        return fixPendingTest(fixer, context.sourceCode, node);
                    }
                }]
            }
            : {})
    });
}

function checkPendingTestCase(
    context: Readonly<Rule.RuleContext>,
    visitorContext: Readonly<VisitorContext>,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    const node = expectCallExpression(visitorContext.node);

    if (isCallbackMissing(node)) {
        context.report({
            node,
            messageId: 'unexpectedPendingTest'
        });
    } else if (visitorContext.modifier === 'pending') {
        if (shouldAllowSkippedWithComment(context, node, configuration)) {
            return;
        }

        reportSkipped(
            context,
            node,
            configuration.allowSkippedWithComment ? 'unexpectedSkippedTestWithoutComment' : 'unexpectedPendingTest'
        );
    }
}

function checkPendingSuite(
    context: Readonly<Rule.RuleContext>,
    visitorContext: Readonly<VisitorContext>,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    const node = expectCallExpression(visitorContext.node);

    if (visitorContext.modifier === 'pending') {
        if (shouldAllowSkippedWithComment(context, node, configuration)) {
            return;
        }

        reportSkipped(
            context,
            node,
            configuration.allowSkippedWithComment ? 'unexpectedSkippedTestWithoutComment' : 'unexpectedPendingTest'
        );
    }
}

function checkPendingCallback(
    context: Readonly<Rule.RuleContext>,
    callbackNode: Readonly<AnyFunction>,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    const callbackParent = getParentNode(callbackNode);

    visitThisSkipCalls(context.sourceCode, callbackNode.body, (thisSkipCall) => {
        if (
            configuration.allowSkippedWithComment &&
            (hasAdjacentLeadingComment(context.sourceCode, asRuleNode(thisSkipCall)) ||
                hasAdjacentLeadingComment(context.sourceCode, callbackParent))
        ) {
            return;
        }

        reportSkipped(
            context,
            thisSkipCall,
            configuration.allowSkippedWithComment ? 'unexpectedSkippedTestWithoutComment' : 'unexpectedPendingTest'
        );
    });
}

export const noPendingTestsRule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow pending tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-pending-tests.md'
        },
        defaultOptions: [defaultOption],
        hasSuggestions: true,
        messages: {
            unexpectedPendingTest: 'Unexpected pending mocha test.',
            unexpectedSkippedTestWithoutComment: 'Unexpected skipped mocha test without a preceding comment.',
            removePendingModifier: 'Remove the pending modifier from this Mocha call.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const configuration = getRuleOption<ResolvedOption>(context);

        return createMochaVisitors(context, {
            testCase(visitorContext) {
                checkPendingTestCase(context, visitorContext, configuration);
            },

            suite(visitorContext) {
                checkPendingSuite(context, visitorContext, configuration);
            },

            anyTestEntityCallback(visitorContext) {
                checkPendingCallback(context, visitorContext.node, configuration);
            }
        });
    }
};
