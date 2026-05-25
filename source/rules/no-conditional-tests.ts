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

    while (true) {
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
        languages: ['js/js'],
        docs: {
            description: 'Disallow conditional suite and test declarations',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-conditional-tests.md'
        },
        messages: {
            unexpectedConditionalTest: 'Unexpected conditional Mocha suite or test declaration.'
        },
        schema: []
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
