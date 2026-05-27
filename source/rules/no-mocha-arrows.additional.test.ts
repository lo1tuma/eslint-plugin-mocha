import { Linter, type Rule, type SourceCode } from 'eslint';
import assert from 'node:assert';
import { fixArrowFunction } from './no-mocha-arrows.js';

type FixArrowFunctionNode = Parameters<typeof fixArrowFunction>[2];

function asRuleFix(fix: Record<string, unknown>): Rule.Fix {
    return fix as unknown as Rule.Fix;
}

function asRuleFixer(fixer: Record<string, unknown>): Rule.RuleFixer {
    return fixer as unknown as Rule.RuleFixer;
}

function readArrowFunction(code: string): {
    arrowFunction: Readonly<FixArrowFunctionNode>;
    sourceCode: Readonly<SourceCode>;
} {
    const linter = new Linter();
    let result: {
        arrowFunction: Readonly<FixArrowFunctionNode>;
        sourceCode: Readonly<SourceCode>;
    } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [firstStatement] = ruleContext.sourceCode.ast.body;
                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');
                    assert.strictEqual(firstStatement?.expression.type, 'CallExpression');

                    const [firstArgument] = firstStatement.expression.arguments;
                    assert.notStrictEqual(firstArgument, undefined);
                    assert.strictEqual(firstArgument?.type, 'ArrowFunctionExpression');

                    result = {
                        arrowFunction: firstArgument as FixArrowFunctionNode,
                        sourceCode: ruleContext.sourceCode
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
        arrowFunction: Readonly<FixArrowFunctionNode>;
        sourceCode: Readonly<SourceCode>;
    };
}

describe('no-mocha-arrows fixer', function () {
    it('preserves comment indentation after the first newline', function () {
        const { arrowFunction, sourceCode } = readArrowFunction(
            'it(() =>\n//hello\t\nassert(hello, false))'
        );
        let replacement: string | null = null;

        fixArrowFunction(
            asRuleFixer({
                replaceTextRange(_range: readonly [number, number], text: string) {
                    replacement = text;
                    return asRuleFix({});
                }
            }),
            sourceCode,
            arrowFunction
        );

        assert.strictEqual(replacement, 'function() {\n//hello\t\nreturn assert(hello, false); }');
    });
});
