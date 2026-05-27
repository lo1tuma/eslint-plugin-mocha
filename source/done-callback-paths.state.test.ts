import type { Rule } from 'eslint';
import assert from 'node:assert';
import {
    applyBindingAssignment,
    applyContainerPropertyAssignment,
    arePendingPathStatesSame,
    collectTrackedCallbackObjectProperties,
    getTrackedContainerPropertiesFromExpression,
    intersectTrackedContainerPropertiesByBinding
} from './done-callback-paths.js';

type PropertyNode = Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
type ObjectExpressionNode = Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0];

function createPendingPathState(overrides: {
    aliases: readonly string[];
    containerProperties: readonly (readonly [string, readonly string[]])[];
    hasUnhandledPath: boolean;
}): Parameters<typeof arePendingPathStatesSame>[0] {
    return {
        aliasBindings: new Set(overrides.aliases),
        containerPropertiesByBinding: new Map(
            overrides.containerProperties.map(([binding, properties]) => {
                return [binding, new Set(properties)] as const;
            })
        ),
        hasUnhandledPath: overrides.hasUnhandledPath
    };
}

function createSourceCode(): Parameters<typeof getTrackedContainerPropertiesFromExpression>[0] {
    const scope = {
        childScopes: [],
        set: new Map(),
        upper: null
    } as unknown as Rule.RuleContext['sourceCode']['scopeManager']['globalScope'];

    return {
        getScope() {
            return scope as unknown as ReturnType<Rule.RuleContext['sourceCode']['getScope']>;
        }
    } as unknown as Parameters<typeof getTrackedContainerPropertiesFromExpression>[0];
}

function identifier(name: string): IdentifierNode {
    return { name, type: 'Identifier' } as unknown as IdentifierNode;
}

function literal(value: number | string | null): Rule.Node {
    return { type: 'Literal', value } as unknown as Rule.Node;
}

function property(
    key: Readonly<Rule.Node>,
    value: Readonly<Rule.Node>,
    computed = false
): PropertyNode {
    return {
        computed,
        key,
        kind: 'init',
        type: 'Property',
        value
    } as unknown as PropertyNode;
}

function objectExpression(properties: readonly Readonly<PropertyNode>[]): ObjectExpressionNode {
    return { properties, type: 'ObjectExpression' } as unknown as ObjectExpressionNode;
}

function bindingAssignment(
    target: string,
    source: Readonly<Rule.Node> | null
): Parameters<typeof applyBindingAssignment>[2] {
    return { source, target, type: 'bindingAssignment' };
}

function containerPropertyAssignment(
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): Parameters<typeof applyContainerPropertyAssignment>[2] {
    return { propertyName, source, target, type: 'containerPropertyAssignment' };
}

describe('done callback path state helpers', function () {
    it('arePendingPathStatesSame() distinguishes path, alias, and property changes', function () {
        const baseState = createPendingPathState({
            aliases: ['done'],
            containerProperties: [['callbacks', ['complete']]],
            hasUnhandledPath: true
        });

        assert.strictEqual(
            arePendingPathStatesSame(
                baseState,
                createPendingPathState({
                    aliases: ['done'],
                    containerProperties: [['callbacks', ['complete']]],
                    hasUnhandledPath: true
                })
            ),
            true
        );
        assert.strictEqual(
            arePendingPathStatesSame(
                baseState,
                createPendingPathState({
                    aliases: ['done'],
                    containerProperties: [['callbacks', ['complete']]],
                    hasUnhandledPath: false
                })
            ),
            false
        );
        assert.strictEqual(
            arePendingPathStatesSame(
                baseState,
                createPendingPathState({
                    aliases: ['finish'],
                    containerProperties: [['callbacks', ['complete']]],
                    hasUnhandledPath: true
                })
            ),
            false
        );
        assert.strictEqual(
            arePendingPathStatesSame(
                baseState,
                createPendingPathState({
                    aliases: ['done'],
                    containerProperties: [['callbacks', ['other']]],
                    hasUnhandledPath: true
                })
            ),
            false
        );
    });

    it('intersectTrackedContainerPropertiesByBinding() drops bindings without shared properties', function () {
        const result = intersectTrackedContainerPropertiesByBinding([
            createPendingPathState({
                aliases: ['done'],
                containerProperties: [['callbacks', ['complete']]],
                hasUnhandledPath: true
            }),
            createPendingPathState({
                aliases: ['done'],
                containerProperties: [['callbacks', ['other']]],
                hasUnhandledPath: true
            })
        ]);

        assert.strictEqual(result.has('callbacks'), false);
    });

    it('collectTrackedCallbackObjectProperties() ignores non-init properties', function () {
        const result = collectTrackedCallbackObjectProperties(
            createSourceCode(),
            objectExpression([{
                computed: false,
                key: identifier('done'),
                kind: 'get',
                type: 'Property',
                value: identifier('done')
            } as unknown as PropertyNode]),
            {
                aliasBindings: new Set(['done']),
                containerPropertiesByBinding: new Map()
            }
        );

        assert.deepStrictEqual(Array.from(result), []);
    });

    it('collectTrackedCallbackObjectProperties() ignores non-property elements', function () {
        const result = collectTrackedCallbackObjectProperties(
            createSourceCode(),
            objectExpression([{
                kind: 'init',
                key: identifier('done'),
                type: 'SpreadElement',
                value: identifier('done')
            } as unknown as PropertyNode]),
            {
                aliasBindings: new Set(['done']),
                containerPropertiesByBinding: new Map()
            }
        );

        assert.deepStrictEqual(Array.from(result), []);
    });

    it('getTrackedContainerPropertiesFromExpression() ignores empty callback containers', function () {
        const result = getTrackedContainerPropertiesFromExpression(
            createSourceCode(),
            objectExpression([property(literal('complete'), literal(0), true)]),
            {
                aliasBindings: new Set(['done']),
                containerPropertiesByBinding: new Map()
            } as Parameters<typeof getTrackedContainerPropertiesFromExpression>[2]
        );

        assert.strictEqual(result, undefined);
    });

    it('getTrackedContainerPropertiesFromExpression() ignores untracked identifier containers', function () {
        const result = getTrackedContainerPropertiesFromExpression(
            createSourceCode(),
            identifier('callbacks'),
            {
                aliasBindings: new Set(['done']),
                containerPropertiesByBinding: new Map()
            } as Parameters<typeof getTrackedContainerPropertiesFromExpression>[2]
        );

        assert.strictEqual(result, undefined);
    });

    it('applyBindingAssignment() skips untracked callback containers', function () {
        const nextState = applyBindingAssignment(
            createSourceCode(),
            createPendingPathState({
                aliases: ['done'],
                containerProperties: [],
                hasUnhandledPath: true
            }),
            bindingAssignment(
                'callbacks',
                objectExpression([property(literal('complete'), literal(0), true)])
            )
        );

        assert.strictEqual(nextState.containerPropertiesByBinding.has('callbacks'), false);
    });

    it('applyContainerPropertyAssignment() removes empty tracked containers', function () {
        const nextState = applyContainerPropertyAssignment(
            createSourceCode(),
            createPendingPathState({
                aliases: ['done'],
                containerProperties: [['callbacks', ['complete']]],
                hasUnhandledPath: true
            }),
            containerPropertyAssignment('callbacks', 'complete', null)
        );

        assert.strictEqual(nextState.containerPropertiesByBinding.has('callbacks'), false);
    });
});
