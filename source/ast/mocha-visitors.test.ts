import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import { callExpressionVisitor, createMochaVisitors, dispatchCallback } from './mocha-visitors.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
type ProgramNode = Parameters<Exclude<Rule.RuleListener['Program'], undefined>>[0];

function asNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

function readProgramBody(node: ProgramNode): Readonly<ProgramNode['body']> {
    return node.body;
}

const programOnlyRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            Program(node) {
                readProgramBody(node);
            }
        });
    }
};

ruleTester.run('mocha-visitors', programOnlyRule, {
    valid: [
        'beforeEach(function () {});',
        'const answer = 42;'
    ],
    invalid: []
});

describe('mocha visitor helpers', function () {
    it('dispatchCallback() ignores non-call-expression nodes', function () {
        let called = false;

        dispatchCallback(function () {
            called = true;
        }, {
            interface: 'BDD',
            modifier: null,
            name: 'it()',
            node: asNode({
                type: 'Identifier'
            }),
            type: 'testCase'
        });

        assert.strictEqual(called, false);
    });

    it('callExpressionVisitor() always runs the generic listener', function () {
        const node = asNode({ type: 'CallExpression' });
        const cachedMochaCallsByNode = new WeakMap<Rule.Node, { kind: 0; reference: never; }>();
        let genericCallCount = 0;

        callExpressionVisitor(cachedMochaCallsByNode as never, node as never, {
            generic() {
                genericCallCount += 1;
            }
        });

        assert.strictEqual(genericCallCount, 1);
    });
});
