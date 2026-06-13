import assert from 'node:assert';
import { suite, test } from 'mocha';
import { asRuleNode } from './rule-node.js';

suite('rule node helpers', function () {
    test('asRuleNode() returns nodes with a type property', function () {
        const node = { type: 'Identifier', name: 'done' };

        assert.strictEqual(asRuleNode(node), node);
    });

    test('asRuleNode() throws for non-node values', function () {
        assert.throws(function () {
            asRuleNode(null);
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected ESLint rule node.';
        });
    });

    test('asRuleNode() rejects nodes whose type is not a string', function () {
        assert.throws(function () {
            asRuleNode({ type: 1 });
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected ESLint rule node.';
        });
    });
});
