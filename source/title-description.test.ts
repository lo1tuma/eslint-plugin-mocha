import assert from 'node:assert';
import { Linter, type Rule, type SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import type { CallExpression } from './ast/node-types.ts';
import { getTitleDescription } from './title-description.ts';

type ReadExpressionResult = {
    readonly sourceCode: Readonly<SourceCode>;
    readonly expression: Readonly<CallExpression>;
};

function readCallExpression(code: string): ReadExpressionResult {
    const linter = new Linter();
    let result: ReadExpressionResult | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [ firstStatement ] = ruleContext.sourceCode.ast.body;

                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');
                    assert.strictEqual(firstStatement.expression.type, 'CallExpression');

                    result = {
                        sourceCode: ruleContext.sourceCode,
                        expression: firstStatement.expression as unknown as Readonly<CallExpression>
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

    return result as unknown as ReadExpressionResult;
}

suite('title descriptions', function () {
    test('getTitleDescription() detects missing titles', function () {
        const { expression, sourceCode } = readCallExpression('describe();');

        assert.deepStrictEqual(getTitleDescription(sourceCode, expression), { kind: 'missing' });
    });

    test('getTitleDescription() detects dynamic titles', function () {
        const { expression, sourceCode } = readCallExpression('describe(title);');

        assert.deepStrictEqual(getTitleDescription(sourceCode, expression), { kind: 'dynamic' });
    });

    test('getTitleDescription() detects static titles', function () {
        const { expression, sourceCode } = readCallExpression('describe("works");');

        assert.deepStrictEqual(getTitleDescription(sourceCode, expression), { kind: 'static', value: 'works' });
    });
});
