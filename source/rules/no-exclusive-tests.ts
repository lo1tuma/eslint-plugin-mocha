import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { isCallExpression, isMemberExpression, type MemberExpression } from '../ast/node-types.js';

export function fixExclusiveTest(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>
): Readonly<Rule.Fix | null> {
    if (!isCallExpression(node) || !isMemberExpression(node.callee)) {
        return null;
    }

    return node.callee.range === undefined
        ? null
        : fixer.replaceTextRange(node.callee.range, sourceCode.getText(node.callee.object));
}

export function getExclusivePropertyNode(node: Readonly<Rule.Node>): Readonly<MemberExpression['property']> | null {
    if (!isCallExpression(node) || !isMemberExpression(node.callee)) {
        return null;
    }

    return node.callee.property;
}

export function createExclusiveTestReportDescriptor(
    node: Readonly<Rule.Node>,
    exclusivePropertyNode: Readonly<MemberExpression['property']>
): Rule.ReportDescriptor & { messageId: 'unexpectedExclusiveTest'; } {
    return exclusivePropertyNode.loc === null || exclusivePropertyNode.loc === undefined
        ? { node, messageId: 'unexpectedExclusiveTest' }
        : { node, loc: exclusivePropertyNode.loc, messageId: 'unexpectedExclusiveTest' };
}

export const noExclusiveTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow exclusive tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-exclusive-tests.md'
        },
        hasSuggestions: true,
        messages: {
            unexpectedExclusiveTest: 'Unexpected exclusive mocha test.',
            removeExclusiveModifier: 'Remove the exclusive modifier from this Mocha call.'
        },
        schema: []
    },
    create(context) {
        const { sourceCode } = context;

        function checkPresenceOfExclusiveModifier(visitorContext: Readonly<VisitorContext>): void {
            const exclusivePropertyNode = getExclusivePropertyNode(visitorContext.node);

            if (visitorContext.modifier === 'exclusive' && exclusivePropertyNode !== null) {
                context.report({
                    ...createExclusiveTestReportDescriptor(visitorContext.node, exclusivePropertyNode),
                    suggest: [{
                        messageId: 'removeExclusiveModifier',
                        fix(fixer) {
                            return fixExclusiveTest(fixer, sourceCode, visitorContext.node);
                        }
                    }]
                });
            }
        }

        return createMochaVisitors(context, {
            suiteOrTestCase: checkPresenceOfExclusiveModifier
        });
    }
};
