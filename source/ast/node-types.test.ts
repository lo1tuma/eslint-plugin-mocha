import type { Rule } from 'eslint';
import assert from 'node:assert';
import {
    expectCallExpression,
    expectMemberExpression,
    getParentNode,
    isLiteral
} from './node-types.js';

function asNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

describe('node type helpers', function () {
    it('getParentNode() returns the parent node', function () {
        const parent = asNode({ type: 'Program' });
        const node = asNode({ type: 'Identifier', parent });

        assert.strictEqual(getParentNode(node), parent);
    });

    it('getParentNode() throws when the parent is missing', function () {
        const node = asNode({ type: 'Program', parent: null });

        assert.throws(function () {
            getParentNode(node);
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected node to have a parent.';
        });
    });

    it('isLiteral() rejects non-literal nodes', function () {
        assert.strictEqual(isLiteral(asNode({ type: 'Identifier' })), false);
    });

    it('expectCallExpression() returns call expression nodes', function () {
        const node = asNode({ type: 'CallExpression', callee: asNode({ type: 'Identifier' }), arguments: [] });

        assert.strictEqual(expectCallExpression(node), node);
    });

    it('expectCallExpression() throws for other node types', function () {
        assert.throws(function () {
            expectCallExpression(asNode({ type: 'Identifier' }));
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected CallExpression node, got Identifier.';
        });
    });

    it('expectMemberExpression() returns member expression nodes', function () {
        const node = asNode({
            type: 'MemberExpression',
            object: asNode({ type: 'Identifier' }),
            property: asNode({ type: 'Identifier' }),
            computed: false
        });

        assert.strictEqual(expectMemberExpression(node), node);
    });

    it('expectMemberExpression() throws for other node types', function () {
        assert.throws(function () {
            expectMemberExpression(asNode({ type: 'Identifier' }));
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected MemberExpression node, got Identifier.';
        });
    });
});
