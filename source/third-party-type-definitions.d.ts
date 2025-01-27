declare module "@eslint-community/eslint-utils" {
    import type { Rule, Scope } from 'eslint';

    type Node = Omit<Rule.Node, 'parent'>;


    export function findVariable(initialScope: Scope.Scope, nameOrNode: string | Node): Scope.Variable | null;

    export function getStringIfConstant(node: Node, initialScope?: Scope.Scope | null | undefined): string | null;

}
