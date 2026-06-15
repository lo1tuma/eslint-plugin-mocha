import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import { suite, test } from 'mocha';
import { createTrackedCallbackVisitors } from './callback-tracking.ts';

function createSourceCode(): Rule.RuleContext['sourceCode'] {
    const linter = new Linter();
    linter.verify('function wrapper() {}', {
        languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
        rules: {}
    });

    return linter.getSourceCode();
}

function createCodePath(): Rule.CodePath {
    return {
        initialSegment: { id: 'start', nextSegments: [], prevSegments: [] },
        returnedSegments: []
    } as unknown as Rule.CodePath;
}

function createFunctionExpression(): Rule.Node {
    return {
        type: 'FunctionExpression',
        params: [],
        body: {
            type: 'BlockStatement',
            body: []
        }
    } as unknown as Rule.Node;
}

function collectOperationTypes(code: string): readonly string[] {
    const linter = new Linter();
    let operationTypes: readonly string[] = [];

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return createTrackedCallbackVisitors(ruleContext, {
                ignorePending: false,
                includeInheritedCallbackBinding: false,
                onTrackedFunctionEnd(trackedFunction) {
                    const operations = Array.from(trackedFunction.operationsBySegmentId.values()).flat();

                    operationTypes = operations.map(function (operation) {
                        return operation.type;
                    });
                }
            });
        }
    };

    const messages = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testRule } } },
        languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });

    assert.deepStrictEqual(messages, []);

    return operationTypes;
}

suite('callback tracking', function () {
    test('ignores non-mocha functions without inherited callback bindings', function () {
        const trackedFunctions: unknown[] = [];
        const visitors = createTrackedCallbackVisitors(
            {
                settings: {},
                sourceCode: createSourceCode()
            } as unknown as Rule.RuleContext,
            {
                ignorePending: false,
                includeInheritedCallbackBinding: true,
                onTrackedFunctionEnd(trackedFunction) {
                    trackedFunctions.push(trackedFunction);
                }
            }
        );
        const codePath = createCodePath();
        const node = createFunctionExpression();

        visitors.onCodePathStart?.(codePath, node);
        visitors.onCodePathEnd?.(codePath, node);

        assert.deepStrictEqual(trackedFunctions, []);
    });

    test('ignores delete expressions without member access inside tracked callbacks', function () {
        const operationTypes = collectOperationTypes(
            'it("title", function(done) { const callbackAlias = done; delete callbackAlias; });'
        );

        assert.strictEqual(operationTypes.includes('bindingAssignment'), true);
        assert.strictEqual(operationTypes.includes('containerPropertyAssignment'), false);
    });

    test('ignores non-delete unary member access inside tracked callbacks', function () {
        const operationTypes = collectOperationTypes(
            'it("title", function(done) { const callbacks = { complete: done }; typeof callbacks.complete; });'
        );

        assert.strictEqual(operationTypes.includes('bindingAssignment'), true);
        assert.strictEqual(operationTypes.includes('containerPropertyAssignment'), false);
    });
});
