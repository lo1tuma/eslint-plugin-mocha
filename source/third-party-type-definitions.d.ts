declare module '@eslint-community/eslint-utils' {
    import type { Rule, Scope } from 'eslint';
    import type { Except } from 'type-fest';

    type Node = Except<Rule.Node, 'parent'>;

    export function findVariable(
        initialScope: Readonly<Scope.Scope>,
        nameOrNode: Readonly<Node> | string
    ): Scope.Variable | null;

    export function getStringIfConstant(
        node: Readonly<Node>,
        initialScope?: Readonly<Scope.Scope> | null
    ): string | null;

    export function getStaticValue(
        node: Readonly<Node>,
        initialScope?: Readonly<Scope.Scope> | null
    ): { readonly value: unknown; readonly optional?: true; } | null;
}
