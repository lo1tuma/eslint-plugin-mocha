export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasProperty<TProperty extends string>(
    value: Record<string, unknown>,
    property: TProperty
): value is Record<string, unknown> & Record<TProperty, unknown> {
    return Object.hasOwn(value, property);
}
