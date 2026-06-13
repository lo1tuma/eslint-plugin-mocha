import { Linter, type Rule } from 'eslint';
import { hasUnhandledReturnPath } from './done-callback-paths.js';

type SegmentEdge = readonly [string, string];

type MemberExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0]>;
type PropertyNode = Readonly<Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0]>;
export type ObjectExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0]>;
type CallExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0]>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type SpreadElementNode = Extract<
    Readonly<CallExpressionNode['arguments'][number]>,
    { readonly type: 'SpreadElement'; }
>;
type Operation = Parameters<typeof hasUnhandledReturnPath>[0]['operationsBySegmentId'] extends ReadonlyMap<
    string,
    readonly (infer CurrentOperation)[]
> ? CurrentOperation
    : never;

export function createSourceCode(): Rule.RuleContext['sourceCode'] {
    const linter = new Linter({ configType: 'flat' });

    linter.verify('', [ {
        languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
        rules: {}
    } ]);

    return linter.getSourceCode();
}

export function identifier(name: string): IdentifierNode {
    return { type: 'Identifier', name } as unknown as IdentifierNode;
}

export function literal(value: number | string | null): Rule.Node {
    return { type: 'Literal', value } as unknown as Rule.Node;
}

export function privateIdentifier(name: string): Rule.Node {
    return { type: 'PrivateIdentifier', name } as unknown as Rule.Node;
}

export function memberExpression(
    object: Readonly<Rule.Node>,
    propertyNode: Readonly<Rule.Node>,
    computed = false
): MemberExpressionNode {
    return {
        computed,
        object,
        property: propertyNode,
        type: 'MemberExpression'
    } as unknown as MemberExpressionNode;
}

export function property(
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

export function objectExpression(
    properties: readonly Readonly<PropertyNode | SpreadElementNode>[]
): ObjectExpressionNode {
    return { properties, type: 'ObjectExpression' } as unknown as ObjectExpressionNode;
}

export function callExpression(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): CallExpressionNode {
    return {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;
}

export function spreadElement(argument: Readonly<Rule.Node>): SpreadElementNode {
    return { argument, type: 'SpreadElement' } as unknown as SpreadElementNode;
}

export function readSegment(segments: ReadonlyMap<string, Rule.CodePathSegment>, id: string): Rule.CodePathSegment {
    const segment = segments.get(id);

    if (segment === undefined) {
        throw new Error(`Expected segment "${id}".`);
    }

    return segment;
}

export function createSegmentGraph(
    segmentIds: readonly string[],
    edges: readonly SegmentEdge[]
): ReadonlyMap<string, Rule.CodePathSegment> {
    const segments = new Map<string, Rule.CodePathSegment>();

    for (const id of segmentIds) {
        segments.set(id, {
            allNextSegments: [],
            allPrevSegments: [],
            id,
            get nextSegments() {
                return edges
                    .filter(function ([ previousId ]) {
                        return previousId === id;
                    })
                    .map(function ([ , nextId ]) {
                        return readSegment(segments, nextId);
                    });
            },
            reachable: true,
            get prevSegments() {
                return edges
                    .filter(function ([ , nextId ]) {
                        return nextId === id;
                    })
                    .map(function ([ previousId ]) {
                        return readSegment(segments, previousId);
                    });
            }
        });
    }

    return segments;
}

export function createSegment(id: string): Rule.CodePathSegment {
    return readSegment(createSegmentGraph([ id ], []), id);
}

export function createCodePath(
    initialSegment: Rule.CodePathSegment,
    returnedSegments: readonly Rule.CodePathSegment[]
): Rule.CodePath {
    return {
        childCodePaths: [],
        finalSegments: [],
        id: 'code-path',
        initialSegment,
        origin: 'function',
        returnedSegments: Array.from(returnedSegments),
        thrownSegments: [],
        traverseSegments() {
            throw new Error('Code path traversal is not supported by this fixture.');
        },
        upper: null
    };
}

export function createThreeBranchCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'left', 'middle', 'right', 'end' ],
        [
            [ 'start', 'left' ],
            [ 'start', 'middle' ],
            [ 'start', 'right' ],
            [ 'left', 'end' ],
            [ 'middle', 'end' ],
            [ 'right', 'end' ]
        ]
    );
    const start = readSegment(segments, 'start');
    const end = readSegment(segments, 'end');

    return createCodePath(start, [ end ]);
}

export function bindingAssignment(target: string, source: Readonly<Rule.Node> | null): Operation {
    return { source, target, type: 'bindingAssignment' };
}

export function containerPropertyAssignment(
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): Operation {
    return {
        propertyName,
        source,
        target,
        type: 'containerPropertyAssignment'
    };
}

export function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Operation {
    return {
        node: callExpression(callee, args),
        type: 'call'
    };
}

export function analyzeOperations(
    operationsBySegmentId: ReadonlyMap<string, readonly Operation[]>,
    codePath: Readonly<Rule.CodePath>
): boolean {
    return hasUnhandledReturnPath({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}
