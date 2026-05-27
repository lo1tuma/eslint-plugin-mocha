import type { Rule, Scope, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    applyBindingSourceValue,
    applyContainerPropertyAssignment,
    collectTrackedCallbackObjectProperties,
    getTrackedContainerPropertiesFromExpression,
    haveSamePendingPathStates,
    haveSameTrackedBindings,
    haveSameTrackedContainerProperties,
    mergeIncomingPendingPathStates,
    type PendingPathState,
    type TrackedBinding
} from './tracked-callback-reference-state.js';

type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
type PropertyNode = Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0];
type ObjectExpressionNode = Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0];
type SpreadElementNode = Extract<Readonly<ObjectExpressionNode['properties'][number]>, { type: 'SpreadElement'; }>;

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

function createSourceCode(): SourceCode {
    const scope = {
        childScopes: [],
        set: new Map(),
        upper: null
    } as unknown as Scope.Scope;

    return asSourceCode({
        getScope() {
            return scope;
        }
    });
}

function identifier(name: string): IdentifierNode {
    return { type: 'Identifier', name } as unknown as IdentifierNode;
}

function property(
    key: Readonly<Rule.Node>,
    value: Readonly<Rule.Node>,
    kind: 'get' | 'init' = 'init'
): PropertyNode {
    return {
        computed: false,
        key,
        kind,
        type: 'Property',
        value
    } as unknown as PropertyNode;
}

function objectExpression(
    properties: readonly Readonly<PropertyNode | SpreadElementNode>[]
): ObjectExpressionNode {
    return { properties, type: 'ObjectExpression' } as unknown as ObjectExpressionNode;
}

function pendingPathState(
    hasUnhandledPath: boolean,
    aliasBindings: readonly TrackedBinding[] = [],
    containerPropertiesByBinding: readonly (readonly [TrackedBinding, readonly string[]])[] = []
): PendingPathState {
    return {
        aliasBindings: new Set(aliasBindings),
        containerPropertiesByBinding: new Map(
            containerPropertiesByBinding.map(([binding, properties]) => {
                return [binding, new Set(properties)] as const;
            })
        ),
        hasUnhandledPath
    };
}

describe('tracked callback reference state', function () {
    it('haveSamePendingPathStates() distinguishes handled and unhandled states with the same references', function () {
        assert.strictEqual(
            haveSamePendingPathStates(
                pendingPathState(true, ['done']),
                pendingPathState(false, ['done'])
            ),
            false
        );
    });

    it('mergeIncomingPendingPathStates() drops bindings without shared properties', function () {
        const nextState = mergeIncomingPendingPathStates([
            pendingPathState(true, [], [['callbacks', ['done']]]),
            pendingPathState(true, [], [['callbacks', []]])
        ]);

        assert.deepStrictEqual(nextState.containerPropertiesByBinding, new Map());
    });

    it('getTrackedContainerPropertiesFromExpression() returns undefined for untracked identifiers', function () {
        assert.strictEqual(
            getTrackedContainerPropertiesFromExpression(
                createSourceCode(),
                identifier('callbacks'),
                pendingPathState(true)
            ),
            undefined
        );
    });

    it('getTrackedContainerPropertiesFromExpression() returns undefined for callback containers without tracked properties', function () {
        assert.strictEqual(
            getTrackedContainerPropertiesFromExpression(
                createSourceCode(),
                objectExpression([property(identifier('done'), identifier('done'), 'get')]),
                pendingPathState(true, ['done'])
            ),
            undefined
        );
    });

    it('applyBindingSourceValue() ignores identifier sources without tracked container properties', function () {
        const nextState = applyBindingSourceValue(
            createSourceCode(),
            pendingPathState(true),
            identifier('callbacks'),
            'forwarded'
        );

        assert.deepStrictEqual(nextState.containerPropertiesByBinding, new Map());
    });

    it('collectTrackedCallbackObjectProperties() ignores non-property entries even when they look initialized', function () {
        const trackedProperties = collectTrackedCallbackObjectProperties(
            createSourceCode(),
            objectExpression([{
                argument: identifier('rest'),
                kind: 'init',
                type: 'SpreadElement'
            } as unknown as SpreadElementNode]),
            pendingPathState(true, ['done'])
        );

        assert.deepStrictEqual(trackedProperties, new Set());
    });

    it('applyContainerPropertyAssignment() removes bindings whose tracked properties become empty', function () {
        const nextState = applyContainerPropertyAssignment(
            createSourceCode(),
            pendingPathState(true, [], [['callbacks', ['done']]]),
            {
                propertyName: 'done',
                source: null,
                target: 'callbacks'
            }
        );

        assert.deepStrictEqual(nextState.containerPropertiesByBinding, new Map());
    });

    it('collectTrackedCallbackObjectProperties() ignores non-property entries even when they look initialized', function () {
        const trackedProperties = collectTrackedCallbackObjectProperties(
            createSourceCode(),
            objectExpression([{
                argument: identifier('rest'),
                kind: 'init',
                type: 'SpreadElement'
            } as unknown as SpreadElementNode]),
            pendingPathState(true, ['done'])
        );

        assert.deepStrictEqual(trackedProperties, new Set());
    });

    it('haveSameTrackedBindings() detects different binding counts', function () {
        assert.strictEqual(haveSameTrackedBindings(new Set(['done']), new Set()), false);
        assert.strictEqual(haveSameTrackedBindings(new Set(['done']), new Set(['done', 'finish'])), false);
        assert.strictEqual(haveSameTrackedBindings(new Set(['done', 'finish']), new Set(['done', 'other'])), false);
    });

    it('haveSameTrackedContainerProperties() detects different tracked properties', function () {
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map()
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['other', new Set(['someFunc'])],
                    ['obj', new Set(['someFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['other', new Set(['someFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['obj', new Set(['someFunc', 'otherFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc', 'otherFunc'])]
                ]),
                new Map([
                    ['obj', new Set(['someFunc', 'thirdFunc'])]
                ])
            ),
            false
        );
    });
});
