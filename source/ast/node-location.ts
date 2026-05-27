import type { AST } from 'eslint';
import type * as ESTree from 'estree';

type RangedNode = {
    readonly range?: Readonly<[number, number]> | null | undefined;
};

type LocatedNode = {
    readonly loc?: AST.SourceLocation | ESTree.SourceLocation | null | undefined;
};

function getNodeRange(node: Readonly<RangedNode>): AST.Range | null {
    const { range } = node;

    return range === undefined || range === null ? null : [range[0], range[1]];
}

export function expectNodeRange(node: Readonly<RangedNode>): AST.Range {
    const range = getNodeRange(node);

    if (range === null) {
        throw new TypeError('Expected node range.');
    }

    return range;
}

function getNodeLocation(node: Readonly<LocatedNode>): AST.SourceLocation | null {
    return node.loc ?? null;
}

export function expectNodeLocation(node: Readonly<LocatedNode>): AST.SourceLocation {
    const location = getNodeLocation(node);

    if (location === null) {
        throw new TypeError('Expected node location.');
    }

    return location;
}
