import type { Rule } from 'eslint';
import assert from 'node:assert';
import {
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    type CallbackPathState,
    createEntryState,
    updatePathState
} from './callback-handling-state.js';

type MutableSegment = {
    id: string;
    nextSegments: MutableSegment[];
    prevSegments: MutableSegment[];
};

type CallExpressionNode = Extract<CallbackHandlingOperation, { type: 'call'; }>['node'];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];

function asCodePathSegment(segment: MutableSegment): Rule.CodePathSegment {
    return segment as unknown as Rule.CodePathSegment;
}

function createSegment(id: string): MutableSegment {
    return { id, nextSegments: [], prevSegments: [] };
}

function createCodePath(initialSegment: MutableSegment, returnedSegments: readonly MutableSegment[]): Rule.CodePath {
    return {
        initialSegment: asCodePathSegment(initialSegment),
        returnedSegments: returnedSegments.map(asCodePathSegment)
    } as unknown as Rule.CodePath;
}

function createSourceCode(): CallbackHandlingContext['sourceCode'] {
    const scope = {
        childScopes: [],
        set: new Map(),
        upper: null
    } as unknown as Rule.RuleContext['sourceCode']['scopeManager']['globalScope'];

    return {
        getScope() {
            return scope as unknown as ReturnType<Rule.RuleContext['sourceCode']['getScope']>;
        }
    } as unknown as CallbackHandlingContext['sourceCode'];
}

function createContext(codePath: Readonly<Rule.CodePath>): CallbackHandlingContext {
    return {
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId: new Map(),
        sourceCode: createSourceCode()
    };
}

function identifier(name: string): IdentifierNode {
    return { name, type: 'Identifier' } as unknown as IdentifierNode;
}

function setParent(node: Readonly<Rule.Node> | null | undefined, parent: Readonly<Rule.Node>): void {
    if (node !== null && node !== undefined) {
        Reflect.set(node, 'parent', parent);
    }
}

function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Parameters<typeof updatePathState>[2] {
    const node = {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;

    setParent(callee, node);

    for (const argument of args) {
        setParent(argument as unknown as Rule.Node, node);
    }

    return {
        node,
        type: 'call'
    };
}

function createPathState(overrides: {
    callbackHandled: boolean;
    handledAliases: readonly string[];
    handledContainerProperties: readonly (readonly [string, readonly string[]])[];
    unhandledAliases: readonly string[];
}): CallbackPathState {
    return {
        callbackHandled: overrides.callbackHandled,
        handledReferences: {
            aliasBindings: new Set(overrides.handledAliases),
            containerPropertiesByBinding: new Map(
                overrides.handledContainerProperties.map(([binding, properties]) => {
                    return [binding, new Set(properties)] as const;
                })
            )
        },
        unhandledReferences: {
            aliasBindings: new Set(overrides.unhandledAliases),
            containerPropertiesByBinding: new Map()
        }
    };
}

describe('callback handling entry state helpers', function () {
    it('updatePathState() ignores unknown delegate calls', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState({
                callbackHandled: false,
                handledAliases: [],
                handledContainerProperties: [],
                unhandledAliases: ['done']
            }),
            callOperation(identifier('scheduleLater'), [identifier('done')])
        );

        assert.strictEqual(nextState.callbackHandled, false);
        assert.deepStrictEqual(Array.from(nextState.handledReferences.aliasBindings, String), []);
    });

    it('createEntryState() merges tracked container properties from previous states', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegment('end');
        end.prevSegments.push(left, right);

        const entryState = createEntryState(
            createContext(createCodePath(start, [end])),
            asCodePathSegment(end),
            new Map([
                [
                    'left',
                    createPathState({
                        callbackHandled: false,
                        handledAliases: [],
                        handledContainerProperties: [['callbacks', ['complete']]],
                        unhandledAliases: ['done']
                    })
                ],
                [
                    'right',
                    createPathState({
                        callbackHandled: false,
                        handledAliases: [],
                        handledContainerProperties: [['callbacks', ['finish']]],
                        unhandledAliases: ['done']
                    })
                ]
            ])
        );

        assert.deepStrictEqual(
            Array.from(entryState.handledReferences.containerPropertiesByBinding.get('callbacks') ?? []).toSorted(
                (currentValue, nextValue) => {
                    return currentValue.localeCompare(nextValue);
                }
            ),
            ['complete', 'finish']
        );
    });
});
