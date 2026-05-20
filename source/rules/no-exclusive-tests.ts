import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { isCallExpression, isMemberExpression, type MemberExpression } from '../ast/node-types.js';

function fixExclusiveTest(
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

function getExclusivePropertyNode(node: Readonly<Rule.Node>): Readonly<MemberExpression['property']> | null {
    if (!isCallExpression(node) || !isMemberExpression(node.callee)) {
        return null;
    }

    return node.callee.property;
}

export const noExclusiveTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow exclusive tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-exclusive-tests.md'
        },
        fixable: 'code',
        messages: {
            unexpectedExclusiveTest: 'Unexpected exclusive mocha test.'
        },
        schema: []
    },
    create(context) {
        const { sourceCode } = context;

        function checkPresenceOfExclusiveModifier(visitorContext: Readonly<VisitorContext>): void {
            const exclusivePropertyNode = getExclusivePropertyNode(visitorContext.node);

            if (visitorContext.modifier === 'exclusive' && exclusivePropertyNode !== null) {
                const reportDescriptor = exclusivePropertyNode.loc === null || exclusivePropertyNode.loc === undefined
                    ? { node: visitorContext.node, messageId: 'unexpectedExclusiveTest' as const }
                    : {
                        node: visitorContext.node,
                        loc: exclusivePropertyNode.loc,
                        messageId: 'unexpectedExclusiveTest' as const
                    };

                context.report({
                    ...reportDescriptor,
                    fix(fixer) {
                        return fixExclusiveTest(fixer, sourceCode, visitorContext.node);
                    }
                });
            }
        }

        return createMochaVisitors(context, {
            suiteOrTestCase: checkPresenceOfExclusiveModifier
        });
    }
};
