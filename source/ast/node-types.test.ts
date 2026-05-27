import type { Rule } from 'eslint';
import assert from 'node:assert';
import { getParentNode, isLiteral } from './node-types.js';

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
});
