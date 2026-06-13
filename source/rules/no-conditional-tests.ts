import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { getParentNode, isFunction, isProgram } from '../ast/node-types.js';

function isConditionalNode(node: Readonly<Rule.Node>): boolean {
    return node.type === 'IfStatement' ||
        node.type === 'ConditionalExpression' ||
        node.type === 'LogicalExpression';
}

function isInsideConditional(node: Readonly<Rule.Node>): boolean {
    let current = node;

    for (;;) {
        const parent = getParentNode(current);

        if (isFunction(parent) || isProgram(parent)) {
            return false;
        }

        if (isConditionalNode(parent)) {
            return true;
        }

        current = parent;
    }
}

export const noConditionalTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow conditional suite and test declarations',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-conditional-tests.md'
        },
        schema: [],
        messages: {
            unexpectedConditionalTest: 'Unexpected conditional Mocha suite or test declaration.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        return createMochaVisitors(context, {
            suiteOrTestCase(visitorContext) {
                if (isInsideConditional(visitorContext.node)) {
                    context.report({
                        node: visitorContext.node,
                        messageId: 'unexpectedConditionalTest'
                    });
                }
            }
        });
    }
};
