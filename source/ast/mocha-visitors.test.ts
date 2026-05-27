import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import {
    callExpressionVisitor,
    createMochaVisitors,
    dispatchCallback,
    dispatchSpecificCallExpressionContext
} from './mocha-visitors.js';

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

const configDispatchRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            config(visitorContext) {
                if (visitorContext.config === 'timeout') {
                    ruleContext.report({
                        node: visitorContext.node,
                        message: `timeout:${visitorContext.name}`
                    });
                }
            }
        });
    }
};

ruleTester.run('mocha-visitors config dispatch', configDispatchRule, {
    valid: [
        'it("name", function () {});',
        'beforeEach(function () { this.timeout(1000); });'
    ],
    invalid: [
        {
            code: 'it("name", function () {}).timeout(1000);',
            errors: [{ message: 'timeout:it().timeout()' }]
        }
    ]
});

describe('mocha visitor helpers', function () {
    it('dispatchCallback() ignores non-call-expression nodes', function () {
        let called = false;

        dispatchCallback(function () {
            called = true;
        }, {
            config: null,
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

    it('dispatchSpecificCallExpressionContext() ignores missing suite-or-test dispatchers', function () {
        assert.doesNotThrow(() => {
            dispatchSpecificCallExpressionContext(
                {
                    callbackVisitor: undefined,
                    includeSuiteOrTestCase: true,
                    visitor: undefined
                },
                {},
                {
                    config: null,
                    interface: 'BDD',
                    modifier: null,
                    name: 'it()',
                    node: asNode({
                        arguments: [],
                        callee: asNode({ type: 'Identifier', name: 'it' }),
                        type: 'CallExpression'
                    }),
                    type: 'testCase'
                }
            );
        });
    });
});
