import { Linter, type Rule, type SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    extractMemberExpressionPath,
    getIdentifierName,
    isConstantPath
} from './member-expression.js';

function readExpression(code: string): { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } {
    const linter = new Linter();
    let result: { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [firstStatement] = ruleContext.sourceCode.ast.body;
                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');

                    result = {
                        sourceCode: ruleContext.sourceCode,
                        expression: firstStatement.expression as unknown as Readonly<Rule.Node>
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

    return result as { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; };
}

describe('member expression helpers', function () {
    it('extractMemberExpressionPath() tracks member calls', function () {
        const { sourceCode, expression } = readExpression('foo.bar();');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, ['foo', 'bar()']);
        assert.strictEqual(isConstantPath(result), true);
    });

    it('extractMemberExpressionPath() tracks computed constant members', function () {
        const { sourceCode, expression } = readExpression('foo["bar"];');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, ['foo', 'bar']);
    });

    it('extractMemberExpressionPath() returns a path for identifiers', function () {
        const { sourceCode, expression } = readExpression('foo;');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, ['foo']);
        assert.strictEqual(isConstantPath(result), true);
    });

    it('extractMemberExpressionPath() preserves dynamic members', function () {
        const { sourceCode, expression } = readExpression('foo[bar];');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.strictEqual(result[0], 'foo');
        assert.strictEqual(typeof result[1], 'symbol');
        assert.strictEqual(isConstantPath(result), false);
    });

    it('getIdentifierName() returns a symbol for non-identifiers', function () {
        const { expression } = readExpression('foo["bar"];');
        assert.strictEqual(expression.type, 'MemberExpression');

        const result = getIdentifierName(expression.property);

        assert.strictEqual(typeof result, 'symbol');
    });

    it('extractMemberExpressionPath() returns an empty path for a null input', function () {
        const { sourceCode } = readExpression('foo.bar;');
        const result = extractMemberExpressionPath(sourceCode, null as never);

        assert.deepStrictEqual(result, []);
    });

    it('extractMemberExpressionPath() returns an empty path for unsupported nodes', function () {
        const { sourceCode, expression } = readExpression('42;');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, []);
        assert.strictEqual(isConstantPath(result), true);
    });
});
