import type { Rule, SourceCode } from 'eslint';
import assert from 'node:assert';
import { visitChildNodes, visitWithoutNestedFunctions } from './visit-child-nodes.js';

function asRuleNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

describe('visit child nodes', function () {
    it('visitChildNodes() visits array and direct child nodes', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {
                    ParentNode: ['children', 'child']
                }
            }),
            asRuleNode({
                child: { type: 'Identifier' },
                children: [{ type: 'Literal' }, 'ignore me'],
                type: 'ParentNode'
            }),
            (node) => {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, ['Literal', 'Identifier']);
    });

    it('visitChildNodes() ignores nodes without registered visitor keys', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {}
            }),
            asRuleNode({
                child: { type: 'Identifier' },
                type: 'UnknownNode'
            }),
            (node) => {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, []);
    });

    it('visitWithoutNestedFunctions() skips nested function bodies', function () {
        const visitedTypes: string[] = [];

        visitWithoutNestedFunctions(
            asSourceCode({
                visitorKeys: {
                    Program: ['body'],
                    ExpressionStatement: ['expression'],
                    CallExpression: ['callee', 'arguments'],
                    FunctionExpression: ['params', 'body'],
                    BlockStatement: ['body']
                }
            }),
            asRuleNode({
                body: [{
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'CallExpression',
                        callee: {
                            type: 'FunctionExpression',
                            params: [],
                            body: {
                                type: 'BlockStatement',
                                body: [{ type: 'Identifier', name: 'hidden' }]
                            }
                        },
                        arguments: []
                    }
                }],
                type: 'Program'
            }),
            (node) => {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, [
            'Program',
            'ExpressionStatement',
            'CallExpression',
            'FunctionExpression'
        ]);
    });
});
