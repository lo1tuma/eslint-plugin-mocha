import assert from 'node:assert';
import { asRuleNode } from './rule-node.js';

describe('rule node helpers', function () {
    it('asRuleNode() returns nodes with a type property', function () {
        const node = { type: 'Identifier', name: 'done' };

        assert.strictEqual(asRuleNode(node), node);
    });

    it('asRuleNode() throws for non-node values', function () {
        assert.throws(function () {
            asRuleNode(null);
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected ESLint rule node.';
        });
    });

    it('asRuleNode() rejects nodes whose type is not a string', function () {
        assert.throws(function () {
            asRuleNode({ type: 1 });
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected ESLint rule node.';
        });
    });
});
