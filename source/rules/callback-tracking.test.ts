import { Linter, type Rule } from 'eslint';
import assert from 'node:assert';
import { createTrackedCallbackFunction, createTrackedCallbackVisitors } from './callback-tracking.js';

function asNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

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

                    operationTypes = operations.map((operation) => {
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
    } as Linter.Config);

    assert.deepStrictEqual(messages, []);

    return operationTypes;
}

describe('callback tracking', function () {
    it('createTrackedCallbackFunction() ignores inherited bindings for non-function nodes', function () {
        const trackedFunction = createTrackedCallbackFunction({
            codePath: createCodePath(),
            includeInheritedCallbackBinding: true,
            inheritedCallbackBinding: 'done',
            node: asNode({ type: 'Program' }),
            sourceCode: createSourceCode(),
            trackedCallbackNodes: new WeakSet()
        });

        assert.strictEqual(trackedFunction, undefined);
    });

    it('ignores non-mocha functions without inherited callback bindings', function () {
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

    it('ignores delete expressions without member access inside tracked callbacks', function () {
        const operationTypes = collectOperationTypes(
            'it("title", function(done) { const callbackAlias = done; delete callbackAlias; });'
        );

        assert.strictEqual(operationTypes.includes('bindingAssignment'), true);
        assert.strictEqual(operationTypes.includes('containerPropertyAssignment'), false);
    });
});
