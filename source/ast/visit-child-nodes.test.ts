import assert from 'node:assert';
import type { Rule, SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import { visitChildNodes, visitWithoutNestedFunctions } from './visit-child-nodes.js';

function asRuleNode(node: Readonly<Record<string, unknown>>): Rule.Node {
    return node as unknown as Rule.Node;
}

function asSourceCode(sourceCode: Readonly<Record<string, unknown>>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

suite('visit child nodes', function () {
    test('visitChildNodes() visits array and direct child nodes', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {
                    ParentNode: [ 'children', 'child' ]
                }
            }),
            asRuleNode({
                child: { type: 'Identifier' },
                children: [ { type: 'Literal' }, 'ignore me' ],
                type: 'ParentNode'
            }),
            function (node) {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, [ 'Literal', 'Identifier' ]);
    });

    test('visitChildNodes() ignores nodes without registered visitor keys', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {}
            }),
            asRuleNode({
                child: { type: 'Identifier' },
                type: 'UnknownNode'
            }),
            function (node) {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, []);
    });

    test('visitChildNodes() ignores non-record child values', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {
                    ParentNode: [ 'child' ]
                }
            }),
            asRuleNode({
                child: null,
                type: 'ParentNode'
            }),
            function (node) {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, []);
    });

    test('visitChildNodes() ignores missing child properties', function () {
        const visitedTypes: string[] = [];

        visitChildNodes(
            asSourceCode({
                visitorKeys: {
                    ParentNode: [ 'missingChild' ]
                }
            }),
            asRuleNode({
                type: 'ParentNode'
            }),
            function (node) {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, []);
    });

    test('visitChildNodes() ignores non-record parent values', function () {
        const visitedTypes: string[] = [];
        const callableParent = Object.assign(function createCallableParent(): void {
            return undefined;
        }, {
            child: {
                type: 'ChildNode'
            },
            type: 'ParentNode'
        }) as unknown as Rule.Node;

        visitChildNodes(
            asSourceCode({
                visitorKeys: {
                    ParentNode: [ 'child' ]
                }
            }),
            callableParent,
            function (node) {
                visitedTypes.push(node.type);
            }
        );

        assert.deepStrictEqual(visitedTypes, []);
    });

    test('visitWithoutNestedFunctions() skips nested function bodies', function () {
        const visitedTypes: string[] = [];

        visitWithoutNestedFunctions(
            asSourceCode({
                visitorKeys: {
                    Program: [ 'body' ],
                    ExpressionStatement: [ 'expression' ],
                    CallExpression: [ 'callee', 'arguments' ],
                    FunctionExpression: [ 'params', 'body' ],
                    BlockStatement: [ 'body' ]
                }
            }),
            asRuleNode({
                body: [ {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'CallExpression',
                        callee: {
                            type: 'FunctionExpression',
                            params: [],
                            body: {
                                type: 'BlockStatement',
                                body: [ { type: 'Identifier', name: 'hidden' } ]
                            }
                        },
                        arguments: []
                    }
                } ],
                type: 'Program'
            }),
            function (node) {
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
