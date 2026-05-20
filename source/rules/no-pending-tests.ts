import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import {
    type CallExpression,
    isCallExpression,
    isIdentifier,
    isLiteral,
    isMemberExpression,
    type MemberExpression
} from '../ast/node-types.js';

type PendingVisitorContext = {
    readonly node: Rule.Node;
    readonly modifier: string | null;
};

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
    return (isIdentifier(node.callee) && node.callee.name.startsWith('x')) || isPendingMemberExpression(node.callee);
}

export function reportSkipped(context: Readonly<Rule.RuleContext>, node: CallExpression): void {
    const nodeToReport = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;

    context.report({
        node: nodeToReport,
        messageId: 'unexpectedPendingTest',
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
    visitorContext: PendingVisitorContext
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
        reportSkipped(context, visitorContext.node);
    }
}

export function checkPendingSuite(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext
): void {
    if (!isCallExpression(visitorContext.node)) {
        return;
    }

    if (visitorContext.modifier === 'pending') {
        reportSkipped(context, visitorContext.node);
    }
}

export const noPendingTestsRule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow pending tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-pending-tests.md'
        },
        hasSuggestions: true,
        messages: {
            unexpectedPendingTest: 'Unexpected pending mocha test.',
            removePendingModifier: 'Remove the pending modifier from this Mocha call.'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            testCase(visitorContext) {
                checkPendingTestCase(context, visitorContext);
            },

            suite(visitorContext) {
                checkPendingSuite(context, visitorContext);
            }
        });
    }
};
