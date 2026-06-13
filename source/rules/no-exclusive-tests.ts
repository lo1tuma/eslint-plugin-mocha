import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { expectNodeRange } from '../ast/node-location.js';
import { expectCallExpression, expectMemberExpression, type MemberExpression } from '../ast/node-types.js';
import { asRuleNode } from '../ast/rule-node.js';

type ImmutableCallNode<T> = { readonly [Key in keyof T]: T[Key]; };
type ExclusiveCallNode = ImmutableCallNode<
    Extract<Rule.Node, { readonly type: 'CallExpression'; }> & {
        readonly callee: MemberExpression;
    }
>;

function fixExclusiveTest(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    node: Readonly<ExclusiveCallNode>
): Readonly<Rule.Fix | null> {
    const range = expectNodeRange(node.callee);

    return fixer.replaceTextRange(range, sourceCode.getText(node.callee.object));
}

function getExclusivePropertyNode(
    node: Readonly<ExclusiveCallNode>
): Readonly<MemberExpression['property']> {
    return node.callee.property;
}

function createExclusiveTestReportDescriptor(
    exclusivePropertyNode: Readonly<MemberExpression['property']>
): Rule.ReportDescriptor & { readonly messageId: 'unexpectedExclusiveTest'; } {
    return { node: exclusivePropertyNode, messageId: 'unexpectedExclusiveTest' };
}

export const noExclusiveTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exclusive tests',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-exclusive-tests.md'
        },
        hasSuggestions: true,
        schema: [],
        messages: {
            unexpectedExclusiveTest: 'Unexpected exclusive mocha test.',
            removeExclusiveModifier: 'Remove the exclusive modifier from this Mocha call.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        const { sourceCode } = context;

        function checkPresenceOfExclusiveModifier(visitorContext: Readonly<VisitorContext>): void {
            if (visitorContext.modifier !== 'exclusive') {
                return;
            }

            const exclusiveCall = expectCallExpression(visitorContext.node);
            const exclusiveNode: Readonly<ExclusiveCallNode> = {
                ...exclusiveCall,
                callee: expectMemberExpression(asRuleNode(exclusiveCall.callee))
            };
            const exclusivePropertyNode = getExclusivePropertyNode(exclusiveNode);
            context.report({
                ...createExclusiveTestReportDescriptor(exclusivePropertyNode),
                suggest: [ {
                    messageId: 'removeExclusiveModifier',
                    fix(fixer) {
                        return fixExclusiveTest(fixer, sourceCode, exclusiveNode);
                    }
                } ]
            });
        }

        return createMochaVisitors(context, {
            suiteOrTestCase: checkPresenceOfExclusiveModifier
        });
    }
};
