declare module '@eslint-community/eslint-utils' {
    import type { Rule, Scope } from 'eslint';
    import type { Except } from 'type-fest';

    type Node = Except<Rule.Node, 'parent'>;

    export function findVariable(
        initialScope: Scope.Scope,
        nameOrNode: Node | string
    ): Scope.Variable | null;

    export function getStringIfConstant(
        node: Node,
        initialScope?: Scope.Scope | null
    ): string | null;
}
