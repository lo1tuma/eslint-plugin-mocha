import { findVariable, getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import { asRuleNode } from './ast/rule-node.ts';

type MemberExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0]>;
type PropertyNode = Readonly<Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0]>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type ObjectExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0]>;
type IdentifierLike = Readonly<Pick<IdentifierNode, 'name' | 'type'>>;
type MemberExpressionLike = Readonly<Pick<MemberExpressionNode, 'computed' | 'object' | 'property' | 'type'>>;
type PropertyLike = Readonly<Pick<PropertyNode, 'computed' | 'key' | 'type'>>;
type PropertyKeyNode = Readonly<MemberExpressionLike['property'] | PropertyLike['key']>;

const dynamicPropertyName = '<dynamic>';

export type TrackedBinding = Readonly<Scope.Variable> | string;
export type TrackedReferenceState = {
    readonly aliasBindings: ReadonlySet<TrackedBinding>;
    readonly containerPropertiesByBinding: ReadonlyMap<TrackedBinding, ReadonlySet<string>>;
};
export type PendingPathState = {
    readonly aliasBindings: ReadonlySet<TrackedBinding>;
    readonly containerPropertiesByBinding: ReadonlyMap<TrackedBinding, ReadonlySet<string>>;
    readonly hasUnhandledPath: boolean;
};

type BindingAndProperty = {
    readonly binding: TrackedBinding;
    readonly propertyName: string | undefined;
};
type ContainerPropertyAssignment = {
    readonly propertyName: string | undefined;
    readonly source: Readonly<Rule.Node> | null;
    readonly target: TrackedBinding;
};
type NonEmptyPendingPathStates = readonly [Readonly<PendingPathState>, ...Readonly<PendingPathState>[]];

export function getTrackedBinding(sourceCode: Readonly<SourceCode>, node: IdentifierLike): TrackedBinding {
    return findVariable(sourceCode.getScope(asRuleNode(node)), node.name) ?? node.name;
}

function hasPendingPathStates(
    states: readonly Readonly<PendingPathState>[]
): states is NonEmptyPendingPathStates {
    return states.length > 0;
}

function getPropertyNode(node: MemberExpressionLike | PropertyLike): PropertyKeyNode {
    if (node.type === 'MemberExpression') {
        return node.property;
    }

    return node.key;
}

function getComputedPropertyName(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike | PropertyLike
): string | undefined {
    return getStringIfConstant(asRuleNode(getPropertyNode(node)), sourceCode.getScope(asRuleNode(node))) ?? undefined;
}

function getNamedPropertyName(node: MemberExpressionLike | PropertyLike): string | undefined {
    const keyNode = getPropertyNode(node);

    if (keyNode.type === 'Identifier') {
        return keyNode.name;
    }
    if (keyNode.type === 'Literal' && keyNode.value !== null) {
        return String(keyNode.value);
    }

    return undefined;
}

function getStaticPropertyName(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike | PropertyLike
): string | undefined {
    return node.computed
        ? getComputedPropertyName(sourceCode, node)
        : getNamedPropertyName(node);
}

export function getMemberExpressionBindingAndProperty(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike
): Readonly<BindingAndProperty> | undefined {
    if (node.object.type !== 'Identifier') {
        return undefined;
    }

    return {
        binding: getTrackedBinding(sourceCode, node.object),
        propertyName: getStaticPropertyName(sourceCode, node)
    };
}

export function createHandledPendingPathState(): PendingPathState {
    return {
        aliasBindings: new Set(),
        containerPropertiesByBinding: new Map(),
        hasUnhandledPath: false
    };
}

export function createInitialPendingPathState(callbackBinding: TrackedBinding): PendingPathState {
    return {
        aliasBindings: new Set([ callbackBinding ]),
        containerPropertiesByBinding: new Map(),
        hasUnhandledPath: true
    };
}

export function cloneTrackedContainerProperties(
    containerPropertiesByBinding: ReadonlyMap<TrackedBinding, ReadonlySet<string>>
): Map<TrackedBinding, Set<string>> {
    return new Map(
        Array.from(containerPropertiesByBinding, function ([ binding, properties ]) {
            return [ binding, new Set(properties) ] as const;
        })
    );
}

export function clonePendingPathState(state: Readonly<PendingPathState>): PendingPathState {
    return {
        aliasBindings: new Set(state.aliasBindings),
        containerPropertiesByBinding: cloneTrackedContainerProperties(state.containerPropertiesByBinding),
        hasUnhandledPath: state.hasUnhandledPath
    };
}

export function haveSameTrackedBindings(
    left: ReadonlySet<TrackedBinding>,
    right: ReadonlySet<TrackedBinding>
): boolean {
    if (left.size !== right.size) {
        return false;
    }

    return Array.from(left).every(function (binding) {
        return right.has(binding);
    });
}

export function haveSameTrackedContainerProperties(
    left: ReadonlyMap<TrackedBinding, ReadonlySet<string>>,
    right: ReadonlyMap<TrackedBinding, ReadonlySet<string>>
): boolean {
    if (left.size !== right.size) {
        return false;
    }

    return Array.from(left).every(function ([ binding, properties ]) {
        const otherProperties = right.get(binding);

        if (properties.size !== otherProperties?.size) {
            return false;
        }

        return Array.from(properties).every(function (property) {
            return otherProperties.has(property);
        });
    });
}

export function haveSamePendingPathStates(
    left: Readonly<PendingPathState>,
    right: Readonly<PendingPathState>
): boolean {
    return left.hasUnhandledPath === right.hasUnhandledPath &&
        haveSameTrackedBindings(left.aliasBindings, right.aliasBindings) &&
        haveSameTrackedContainerProperties(
            left.containerPropertiesByBinding,
            right.containerPropertiesByBinding
        );
}

function intersectBindingSets(states: NonEmptyPendingPathStates): Set<TrackedBinding> {
    const [ firstState, ...otherStates ] = states;
    const bindings = new Set(firstState.aliasBindings);

    for (const binding of Array.from(bindings)) {
        const isSharedBinding = otherStates.every(function (state) {
            return state.aliasBindings.has(binding);
        });

        if (!isSharedBinding) {
            bindings.delete(binding);
        }
    }

    return bindings;
}

function sharedPropertiesForBinding(
    binding: TrackedBinding,
    firstProperties: ReadonlySet<string>,
    otherStates: readonly Readonly<PendingPathState>[]
): Set<string> {
    const sharedProperties = new Set(firstProperties);

    for (const property of Array.from(sharedProperties)) {
        const isSharedProperty = otherStates.every(function (state) {
            return state.containerPropertiesByBinding.get(binding)?.has(property) === true;
        });

        if (!isSharedProperty) {
            sharedProperties.delete(property);
        }
    }

    return sharedProperties;
}

function intersectTrackedContainerPropertiesByBinding(
    states: NonEmptyPendingPathStates
): Map<TrackedBinding, Set<string>> {
    const [ firstState, ...otherStates ] = states;
    const sharedPropertiesByBinding = new Map<TrackedBinding, Set<string>>();

    for (const [ binding, properties ] of firstState.containerPropertiesByBinding) {
        const sharedProperties = sharedPropertiesForBinding(binding, properties, otherStates);

        if (sharedProperties.size > 0) {
            sharedPropertiesByBinding.set(binding, sharedProperties);
        }
    }

    return sharedPropertiesByBinding;
}

export function mergeIncomingPendingPathStates(
    previousStates: readonly Readonly<PendingPathState>[]
): PendingPathState {
    const unhandledStates = previousStates.filter(function (state) {
        return state.hasUnhandledPath;
    });

    if (!hasPendingPathStates(unhandledStates)) {
        return createHandledPendingPathState();
    }

    return {
        aliasBindings: intersectBindingSets(unhandledStates),
        containerPropertiesByBinding: intersectTrackedContainerPropertiesByBinding(unhandledStates),
        hasUnhandledPath: true
    };
}

function getContainerProperties(
    state: Readonly<TrackedReferenceState>,
    binding: TrackedBinding
): ReadonlySet<string> | undefined {
    return state.containerPropertiesByBinding.get(binding);
}

function isTrackedPropertyAccess(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike,
    state: Readonly<TrackedReferenceState>
): boolean {
    const bindingAndProperty = getMemberExpressionBindingAndProperty(sourceCode, node);

    if (bindingAndProperty === undefined) {
        return false;
    }

    const properties = getContainerProperties(state, bindingAndProperty.binding);

    if (properties === undefined) {
        return false;
    }

    if (bindingAndProperty.propertyName === undefined) {
        return properties.has(dynamicPropertyName);
    }

    return properties.has(bindingAndProperty.propertyName);
}

export function isTrackedCallbackExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<TrackedReferenceState>
): boolean {
    if (node.type === 'Identifier') {
        return state.aliasBindings.has(getTrackedBinding(sourceCode, node));
    }

    return node.type === 'MemberExpression' && isTrackedPropertyAccess(sourceCode, node, state);
}

export function collectTrackedCallbackObjectProperties(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<ObjectExpressionNode>,
    state: Readonly<TrackedReferenceState>
): Set<string> {
    const trackedProperties = new Set<string>();

    node.properties.forEach(function collectTrackedCallbackProperty(property) {
        if (property.type === 'Property' && property.kind === 'init') {
            const propertyName = getStaticPropertyName(sourceCode, property);
            const isTrackedCallback = propertyName !== undefined &&
                isTrackedCallbackExpression(sourceCode, asRuleNode(property.value), state);

            if (isTrackedCallback) {
                trackedProperties.add(propertyName);
            }
        }
    });

    return trackedProperties;
}

export function getTrackedContainerPropertiesFromExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<PendingPathState>
): Set<string> | undefined {
    if (node.type === 'Identifier') {
        const properties = getContainerProperties(state, getTrackedBinding(sourceCode, node));

        return properties === undefined ? undefined : new Set(properties);
    }

    if (node.type === 'ObjectExpression') {
        const trackedProperties = collectTrackedCallbackObjectProperties(sourceCode, node, state);

        return trackedProperties.size > 0 ? trackedProperties : undefined;
    }

    return undefined;
}

export function applyBindingSourceValue(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    source: Readonly<Rule.Node> | null,
    target: TrackedBinding
): PendingPathState {
    if (source === null) {
        return clonePendingPathState(state);
    }

    if (isTrackedCallbackExpression(sourceCode, source, state)) {
        return {
            ...state,
            aliasBindings: new Set([ ...state.aliasBindings, target ])
        };
    }

    const containerProperties = getTrackedContainerPropertiesFromExpression(sourceCode, source, state);

    if (containerProperties !== undefined) {
        return {
            ...state,
            containerPropertiesByBinding: new Map([
                ...state.containerPropertiesByBinding,
                [ target, containerProperties ]
            ])
        };
    }

    return clonePendingPathState(state);
}

function nextPropertiesForAssignment(
    currentProperties: ReadonlySet<string> | undefined,
    propertyName: string | undefined
): Set<string> {
    const nextProperties = new Set(currentProperties);

    if (propertyName === undefined) {
        nextProperties.clear();
    } else {
        nextProperties.delete(propertyName);
    }

    return nextProperties;
}

export function applyContainerPropertyAssignment(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    assignment: Readonly<ContainerPropertyAssignment>
): PendingPathState {
    const { propertyName, source, target } = assignment;
    const nextState = clonePendingPathState(state);
    const nextProperties = nextPropertiesForAssignment(
        nextState.containerPropertiesByBinding.get(target),
        propertyName
    );
    const shouldTrackProperty = source !== null &&
        isTrackedCallbackExpression(sourceCode, source, nextState);

    if (shouldTrackProperty) {
        return {
            ...nextState,
            containerPropertiesByBinding: new Map([
                ...nextState.containerPropertiesByBinding,
                [ target, new Set([ ...nextProperties, propertyName ?? dynamicPropertyName ]) ]
            ])
        };
    }

    if (nextProperties.size > 0) {
        return {
            ...nextState,
            containerPropertiesByBinding: new Map([
                ...nextState.containerPropertiesByBinding,
                [ target, nextProperties ]
            ])
        };
    }

    return {
        ...nextState,
        containerPropertiesByBinding: new Map(
            Array.from(nextState.containerPropertiesByBinding).filter(function ([ binding ]) {
                return binding !== target;
            })
        )
    };
}
