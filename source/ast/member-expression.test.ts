import assert from 'node:assert';
import { Linter, type Rule, type SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import {
    extractMemberExpressionPath,
    getIdentifierName,
    isConstantPath
} from './member-expression.ts';

type ReadExpressionResult = {
    readonly sourceCode: Readonly<SourceCode>;
    readonly expression: Readonly<Rule.Node>;
};

function readExpression(
    code: string
): ReadExpressionResult {
    const linter = new Linter();
    let result: ReadExpressionResult | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [ firstStatement ] = ruleContext.sourceCode.ast.body;
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

    return result as unknown as {
        readonly sourceCode: Readonly<SourceCode>;
        readonly expression: Readonly<Rule.Node>;
    };
}

suite('member expression helpers', function () {
    test('extractMemberExpressionPath() tracks member calls', function () {
        const { sourceCode, expression } = readExpression('foo.bar();');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, [ 'foo', 'bar()' ]);
        assert.strictEqual(isConstantPath(result), true);
    });

    test('extractMemberExpressionPath() tracks computed constant members', function () {
        const { sourceCode, expression } = readExpression('foo["bar"];');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, [ 'foo', 'bar' ]);
    });

    test('extractMemberExpressionPath() returns a path for identifiers', function () {
        const { sourceCode, expression } = readExpression('foo;');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, [ 'foo' ]);
        assert.strictEqual(isConstantPath(result), true);
    });

    test('extractMemberExpressionPath() preserves dynamic members', function () {
        const { sourceCode, expression } = readExpression('foo[bar];');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.strictEqual(result[0], 'foo');
        assert.strictEqual(typeof result[1], 'symbol');
        assert.strictEqual(isConstantPath(result), false);
    });

    test('getIdentifierName() returns a symbol for non-identifiers', function () {
        const { expression } = readExpression('foo["bar"];');
        assert.strictEqual(expression.type, 'MemberExpression');

        const result = getIdentifierName(expression.property);

        assert.strictEqual(typeof result, 'symbol');
    });

    test('extractMemberExpressionPath() returns an empty path for a null input', function () {
        const { sourceCode } = readExpression('foo.bar;');
        const result = extractMemberExpressionPath(sourceCode, null as never);

        assert.deepStrictEqual(result, []);
    });

    test('extractMemberExpressionPath() returns an empty path for unsupported nodes', function () {
        const { sourceCode, expression } = readExpression('42;');
        const result = extractMemberExpressionPath(sourceCode, expression);

        assert.deepStrictEqual(result, []);
        assert.strictEqual(isConstantPath(result), true);
    });
});
