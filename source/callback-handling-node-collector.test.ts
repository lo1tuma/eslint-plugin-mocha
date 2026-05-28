import type { Rule } from 'eslint';
import assert from 'node:assert';
import { collectCallbackHandlingNodes } from './callback-handling-node-collector.js';
import type { CallbackHandlingOperation } from './callback-handling-state.js';

type MutableSegment = {
    id: string;
    nextSegments: MutableSegment[];
    prevSegments: MutableSegment[];
};
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];

function identifier(name: string): IdentifierNode {
    return { id: name, name, type: 'Identifier' } as unknown as IdentifierNode;
}

function createSegment(id: string): MutableSegment {
    return { id, nextSegments: [], prevSegments: [] };
}

function linkSegments(previous: MutableSegment, next: MutableSegment): void {
    previous.nextSegments.push(next);
    next.prevSegments.push(previous);
}

function asCodePathSegment(segment: MutableSegment): Rule.CodePathSegment {
    return segment as unknown as Rule.CodePathSegment;
}

function createCodePath(initialSegment: MutableSegment): Rule.CodePath {
    return {
        initialSegment: asCodePathSegment(initialSegment)
    } as unknown as Rule.CodePath;
}

function createSourceCode(): Rule.RuleContext['sourceCode'] {
    return Object.create(null) as Rule.RuleContext['sourceCode'];
}

function bindingAssignment(node: Readonly<Rule.Node>, target: string): CallbackHandlingOperation {
    return {
        node,
        source: null,
        target,
        type: 'bindingAssignment'
    };
}

describe('collectCallbackHandlingNodes()', function () {
    it('stops revisiting unchanged self-referential segments without reports', function () {
        const loop = createSegment('loop');

        linkSegments(loop, loop);

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(loop),
                operationsBySegmentId: new Map(),
                sourceCode: createSourceCode()
            },
            function () {
                return undefined;
            }
        );

        assert.deepStrictEqual(result, []);
    });

    it('continues into following segments after reports with unchanged path state', function () {
        const start = createSegment('start');
        const end = createSegment('end');
        const firstNode = identifier('first');
        const secondNode = identifier('second');

        linkSegments(start, end);

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(start),
                operationsBySegmentId: new Map([
                    ['start', [bindingAssignment(firstNode, 'first')]],
                    ['end', [bindingAssignment(secondNode, 'second')]]
                ]),
                sourceCode: createSourceCode()
            },
            function (_context, _pathState, operation) {
                return operation.node;
            }
        );

        assert.deepStrictEqual(result, [firstNode, secondNode]);
    });

    it('re-enqueues following segments when later reports keep the path state unchanged', function () {
        const loop = createSegment('loop');
        const end = createSegment('end');
        const loopNode = identifier('loop');
        const endNode = identifier('end');
        let loopVisits = 0;

        linkSegments(loop, end);
        linkSegments(loop, loop);

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(loop),
                operationsBySegmentId: new Map([
                    ['loop', [bindingAssignment(loopNode, 'loop')]],
                    ['end', [bindingAssignment(endNode, 'end')]]
                ]),
                sourceCode: createSourceCode()
            },
            function (_context, _pathState, operation) {
                if (operation.node === loopNode) {
                    loopVisits += 1;
                    return loopVisits === 2 ? loopNode : undefined;
                }

                return loopVisits >= 2 ? operation.node : undefined;
            }
        );

        assert.deepStrictEqual(result, [loopNode, endNode]);
    });
});
