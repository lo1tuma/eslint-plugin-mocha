import type { Rule, SourceCode } from 'eslint';
import type { Comment as EstreeComment } from 'estree';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import {
    type CallExpression,
    getParentNode,
    isCallExpression,
    isFunction,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    type MemberExpression
} from '../ast/node-types.js';
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

const defaultOption: ResolvedOption = {
    allowSkippedWithComment: false
};

type PendingVisitorContext = {
    readonly node: Rule.Node;
    readonly modifier: string | null;
};
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
type TraversableNode = Except<Rule.Node, 'parent'>;

export function isCallbackMissing(node: CallExpression): boolean {
    const [firstArgument] = node.arguments;
    return firstArgument !== undefined && firstArgument.type === 'Literal' && node.arguments.length === 1;
}

function fixPendingIdentifier(
    fixer: Rule.RuleFixer,
    callee: Readonly<CallExpression['callee']>
): Readonly<Rule.Fix | null> {
    if (!isIdentifier(callee) || !callee.name.startsWith('x')) {
        return null;
    }

    return fixer.replaceText(callee, callee.name.slice(1));
}

function isNamedSkipProperty(property: Readonly<MemberExpression['property']>): boolean {
    return isIdentifier(property) && property.name === 'skip';
}

function isLiteralSkipProperty(property: Readonly<MemberExpression['property']>): boolean {
    return isLiteral(property) && property.value === 'skip';
}

export function isPendingMemberExpression(
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

export function fixPendingMemberExpression(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    callee: Readonly<CallExpression['callee']>
): Readonly<Rule.Fix | null> {
    if (!isPendingMemberExpression(callee) || callee.range === undefined) {
        return null;
    }

    const { object, range } = callee;

    return fixer.replaceTextRange(range, sourceCode.getText(object));
}

function fixPendingTest(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    node: Readonly<CallExpression>
): Readonly<Rule.Fix | null> {
    return fixPendingIdentifier(fixer, node.callee) ?? fixPendingMemberExpression(fixer, sourceCode, node.callee);
}

function canSuggestPendingTest(node: Readonly<CallExpression>): boolean {
    return (isIdentifier(node.callee) && node.callee.name.startsWith('x')) ||
        (isPendingMemberExpression(node.callee) && !isThisSkipMemberExpression(node.callee));
}

function isSkippedCall(node: Readonly<CallExpression>): boolean {
    return canSuggestPendingTest(node) || isThisSkipCall(node);
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

export function hasAdjacentLeadingComment(
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
        isSkippedCall(node) &&
        hasAdjacentLeadingComment(context.sourceCode, node);
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

function visitThisSkipCalls(
    sourceCode: Readonly<SourceCode>,
    node: TraversableNode,
    visitor: (callExpression: Readonly<CallExpression>) => void
): void {
    if (isCallExpression(node) && isThisSkipCall(node)) {
        visitor(node);
    }

    if (isFunction(node) && node.type !== 'ArrowFunctionExpression') {
        return;
    }

    visitChildNodes(sourceCode, node, (childNode) => {
        visitThisSkipCalls(sourceCode, childNode, visitor);
    });
}

export function reportSkipped(
    context: Readonly<Rule.RuleContext>,
    node: CallExpression,
    messageId: 'unexpectedPendingTest' | 'unexpectedSkippedTestWithoutComment'
): void {
    const nodeToReport = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;

    context.report({
        node: nodeToReport,
        messageId,
        ...(canSuggestPendingTest(node)
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

export function checkPendingTestCase(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    if (!isCallExpression(visitorContext.node)) {
        return;
    }

    if (isCallbackMissing(visitorContext.node)) {
        context.report({
            node: visitorContext.node,
            messageId: 'unexpectedPendingTest'
        });
    } else if (visitorContext.modifier === 'pending') {
        if (shouldAllowSkippedWithComment(context, visitorContext.node, configuration)) {
            return;
        }

        reportSkipped(
            context,
            visitorContext.node,
            configuration.allowSkippedWithComment ? 'unexpectedSkippedTestWithoutComment' : 'unexpectedPendingTest'
        );
    }
}

export function checkPendingSuite(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    if (!isCallExpression(visitorContext.node)) {
        return;
    }

    if (visitorContext.modifier === 'pending') {
        if (shouldAllowSkippedWithComment(context, visitorContext.node, configuration)) {
            return;
        }

        reportSkipped(
            context,
            visitorContext.node,
            configuration.allowSkippedWithComment ? 'unexpectedSkippedTestWithoutComment' : 'unexpectedPendingTest'
        );
    }
}

function checkPendingCallback(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext,
    configuration: Readonly<PendingRuleConfiguration>
): void {
    if (!isFunction(visitorContext.node)) {
        return;
    }

    const callbackParent = getParentNode(visitorContext.node);

    visitThisSkipCalls(context.sourceCode, visitorContext.node.body, (thisSkipCall) => {
        if (
            configuration.allowSkippedWithComment &&
            (hasAdjacentLeadingComment(context.sourceCode, thisSkipCall) ||
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
                checkPendingCallback(context, visitorContext, configuration);
            }
        });
    }
};
