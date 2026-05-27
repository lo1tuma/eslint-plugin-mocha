import { Linter, type Rule, type SourceCode } from 'eslint';
import assert from 'node:assert';
import type { TraversableNode } from '../ast/visit-child-nodes.js';
import {
    getConfigPropertyName,
    getFirstArgument,
    getStaticNumericConfigValue,
    isDisabledTimeoutValue,
    isMochaContextConfigCall,
    isSuiteConfigCall,
    visitMochaContextConfigCalls
} from './config-call.js';

function readExpression(code: string): { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } {
    const linter = new Linter();
    let result: { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const expressionStatement = ruleContext.sourceCode.ast.body.at(-1);
                    assert.notStrictEqual(expressionStatement, undefined);
                    assert.strictEqual(expressionStatement?.type, 'ExpressionStatement');

                    result = {
                        sourceCode: ruleContext.sourceCode,
                        expression: expressionStatement.expression as unknown as Readonly<Rule.Node>
                    };
                }
            };
        }
    };

    const messages = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testRule } } },
        languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    assert.deepStrictEqual(messages, []);
    assert.notStrictEqual(result, null);

    return result as unknown as { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; };
}

function asTraversableNode(node: Readonly<Rule.Node>): Readonly<TraversableNode> {
    return node as unknown as Readonly<TraversableNode>;
}

describe('config call helpers', function () {
    it('getConfigPropertyName() returns config names for direct and computed members', function () {
        const timeoutExpression = readExpression('it("works", function () {}).timeout(5000);').expression;
        const slowExpression = readExpression('it("works", function () {})["slow"](5000);').expression;
        const otherExpression = readExpression('it("works", function () {})["only"]();').expression;

        assert.strictEqual(timeoutExpression.type, 'CallExpression');
        assert.strictEqual(slowExpression.type, 'CallExpression');
        assert.strictEqual(otherExpression.type, 'CallExpression');

        assert.strictEqual(getConfigPropertyName(timeoutExpression), 'timeout');
        assert.strictEqual(getConfigPropertyName(slowExpression), 'slow');
        assert.strictEqual(getConfigPropertyName(otherExpression), null);
    });

    it('getConfigPropertyName() ignores computed properties on non-member expressions', function () {
        const result = getConfigPropertyName({
            type: 'CallExpression',
            arguments: [],
            callee: {
                type: 'Identifier',
                name: 'timeout'
            }
        } as never);

        assert.strictEqual(result, null);
    });

    it('getConfigPropertyName() ignores non-computed literal member properties', function () {
        const result = getConfigPropertyName({
            type: 'CallExpression',
            arguments: [],
            callee: {
                type: 'MemberExpression',
                computed: false,
                object: {
                    type: 'Identifier',
                    name: 'it'
                },
                property: {
                    type: 'Literal',
                    value: 'timeout'
                }
            }
        } as never);

        assert.strictEqual(result, null);
    });

    it('getConfigPropertyName() ignores computed non-string literal member properties', function () {
        const result = getConfigPropertyName({
            type: 'CallExpression',
            arguments: [],
            callee: {
                type: 'MemberExpression',
                computed: true,
                object: {
                    type: 'Identifier',
                    name: 'it'
                },
                property: {
                    type: 'Literal',
                    value: 42
                }
            }
        } as never);

        assert.strictEqual(result, null);
    });

    it('isMochaContextConfigCall() and isSuiteConfigCall() detect this-bound config calls', function () {
        const timeoutExpression = readExpression('this.timeout(5000);').expression;
        const chainedExpression = readExpression('it("works", function () {}).timeout(5000);').expression;

        assert.strictEqual(isMochaContextConfigCall(asTraversableNode(timeoutExpression), 'timeout'), true);
        assert.strictEqual(isMochaContextConfigCall(asTraversableNode(timeoutExpression), 'slow'), false);
        assert.strictEqual(isSuiteConfigCall(asTraversableNode(timeoutExpression)), true);
        assert.strictEqual(isSuiteConfigCall(asTraversableNode(chainedExpression)), false);
    });

    it('getStaticNumericConfigValue() resolves static numeric arguments', function () {
        const literalExpression = readExpression('it("works", function () {}).retries(2);');
        const constantExpression = readExpression(
            'const retryCount = 2; it("works", function () {}).retries(retryCount);'
        );

        assert.strictEqual(literalExpression.expression.type, 'CallExpression');
        assert.strictEqual(constantExpression.expression.type, 'CallExpression');

        assert.strictEqual(getStaticNumericConfigValue(literalExpression.expression, literalExpression.sourceCode), 2);
        assert.strictEqual(
            getStaticNumericConfigValue(constantExpression.expression, constantExpression.sourceCode),
            2
        );
    });

    it('getStaticNumericConfigValue() returns null for spread and non-numeric values', function () {
        const spreadExpression = readExpression('it("works", function () {}).timeout(...values);');
        const stringExpression = readExpression('it("works", function () {}).timeout("2s");');
        const infiniteExpression = readExpression('it("works", function () {}).timeout(1 / 0);');

        assert.strictEqual(spreadExpression.expression.type, 'CallExpression');
        assert.strictEqual(stringExpression.expression.type, 'CallExpression');
        assert.strictEqual(infiniteExpression.expression.type, 'CallExpression');

        assert.strictEqual(getStaticNumericConfigValue(spreadExpression.expression, spreadExpression.sourceCode), null);
        assert.strictEqual(getStaticNumericConfigValue(stringExpression.expression, stringExpression.sourceCode), null);
        assert.strictEqual(
            getStaticNumericConfigValue(infiniteExpression.expression, infiniteExpression.sourceCode),
            null
        );
    });

    it('getStaticNumericConfigValue() returns null for non-static identifiers', function () {
        const identifierExpression = readExpression('it("works", function () {}).timeout(value);');

        assert.strictEqual(identifierExpression.expression.type, 'CallExpression');
        assert.strictEqual(
            getStaticNumericConfigValue(identifierExpression.expression, identifierExpression.sourceCode),
            null
        );
    });

    it('getFirstArgument() ignores spread arguments', function () {
        const spreadExpression = readExpression('it("works", function () {}).timeout(...values);');

        assert.strictEqual(spreadExpression.expression.type, 'CallExpression');
        assert.strictEqual(getFirstArgument(spreadExpression.expression), undefined);
    });

    it('isDisabledTimeoutValue() only matches disabled timeout values', function () {
        assert.strictEqual(isDisabledTimeoutValue(1), false);
        assert.strictEqual(isDisabledTimeoutValue(0), true);
        assert.strictEqual(isDisabledTimeoutValue(2_147_483_647), true);
    });

    it('visitMochaContextConfigCalls() skips nested non-arrow functions', function () {
        const { sourceCode, expression } = readExpression(
            'it("works", function () { this.timeout(1000); (() => this.timeout(2000))(); function later() { this.timeout(3000); } });'
        );
        const visitedTimeouts: number[] = [];

        assert.strictEqual(expression.type, 'CallExpression');
        const callbackBody = expression.arguments[1];
        assert.notStrictEqual(callbackBody, undefined);
        assert.notStrictEqual(callbackBody?.type, 'SpreadElement');
        assert.strictEqual(callbackBody?.type, 'FunctionExpression');

        visitMochaContextConfigCalls(sourceCode, callbackBody.body, 'timeout', (callExpression) => {
            const timeoutValue = getStaticNumericConfigValue(callExpression, sourceCode);
            if (timeoutValue === null) {
                throw new Error('Expected static timeout value');
            }

            visitedTimeouts.push(timeoutValue);
        });

        assert.deepStrictEqual(visitedTimeouts, [1000, 2000]);
    });
});
