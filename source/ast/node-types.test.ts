import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import {
    expectCallExpression,
    expectMemberExpression,
    getParentNode,
    isLiteral
} from './node-types.ts';

function asNode(node: Readonly<Record<string, unknown>>): Rule.Node {
    return node as unknown as Rule.Node;
}

suite('node type helpers', function () {
    test('getParentNode() returns the parent node', function () {
        const parent = asNode({ type: 'Program' });
        const node = asNode({ type: 'Identifier', parent });

        assert.strictEqual(getParentNode(node), parent);
    });

    test('getParentNode() throws when the parent is missing', function () {
        const node = asNode({ type: 'Program', parent: null });

        assert.throws(function () {
            getParentNode(node);
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected node to have a parent.';
        });
    });

    test('isLiteral() rejects non-literal nodes', function () {
        assert.strictEqual(isLiteral(asNode({ type: 'Identifier' })), false);
    });

    test('expectCallExpression() returns call expression nodes', function () {
        const node = asNode({ type: 'CallExpression', callee: asNode({ type: 'Identifier' }), arguments: [] });

        assert.strictEqual(expectCallExpression(node), node);
    });

    test('expectCallExpression() throws for other node types', function () {
        assert.throws(function () {
            expectCallExpression(asNode({ type: 'Identifier' }));
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected CallExpression node, got Identifier.';
        });
    });

    test('expectMemberExpression() returns member expression nodes', function () {
        const node = asNode({
            type: 'MemberExpression',
            object: asNode({ type: 'Identifier' }),
            property: asNode({ type: 'Identifier' }),
            computed: false
        });

        assert.strictEqual(expectMemberExpression(node), node);
    });

    test('expectMemberExpression() throws for other node types', function () {
        assert.throws(function () {
            expectMemberExpression(asNode({ type: 'Identifier' }));
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected MemberExpression node, got Identifier.';
        });
    });
});
