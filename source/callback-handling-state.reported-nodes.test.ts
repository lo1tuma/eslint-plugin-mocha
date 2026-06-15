import assert from 'node:assert';
import type { Rule, Scope, SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import {
    type CallbackHandlingOperation,
    type CallbackPathState,
    getCodeAfterCallbackHandlingNode
} from './callback-handling-state.js';

type CallExpressionNode = Readonly<Extract<CallbackHandlingOperation, { readonly type: 'call'; }>['node']>;
type MemberExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0]>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type LiteralNode =
    & Readonly<Extract<Readonly<CallExpressionNode['arguments'][number]>, { readonly type: 'Literal'; }>>
    & Readonly<Rule.Node>;

function asSourceCode(sourceCode: Readonly<Record<string, unknown>>): SourceCode {
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
    return { name, type: 'Identifier' } as unknown as IdentifierNode;
}

function literal(value: number | string | null): LiteralNode {
    return { type: 'Literal', value } as unknown as LiteralNode;
}

function setParent(node: Readonly<Rule.Node> | null | undefined, parent: Readonly<Rule.Node>): void {
    if (node !== null && node !== undefined) {
        const nodeWithParent = node as Rule.Node & { readonly parent: Rule.Node; };
        nodeWithParent.parent = parent;
    }
}

function memberExpression(
    object: Readonly<Rule.Node>,
    propertyNode: Readonly<Rule.Node>,
    computed = false
): MemberExpressionNode {
    const node = {
        computed,
        object,
        property: propertyNode,
        type: 'MemberExpression'
    } as unknown as MemberExpressionNode;

    setParent(object, node);
    setParent(propertyNode, node);

    return node;
}

function callExpression(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): CallExpressionNode {
    const node = {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;

    setParent(callee, node);

    for (const argument of args) {
        setParent(argument as unknown as Rule.Node, node);
    }

    return node;
}

function createPathState(): CallbackPathState {
    return {
        callbackHandled: true,
        handledReferences: {
            aliasBindings: new Set([ 'done' ]),
            containerPropertiesByBinding: new Map()
        },
        unhandledReferences: {
            aliasBindings: new Set([ 'done' ]),
            containerPropertiesByBinding: new Map()
        }
    };
}

function bindingAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { readonly type: 'bindingAssignment'; }> {
    return { node, source, target, type: 'bindingAssignment' };
}

function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Extract<CallbackHandlingOperation, { readonly type: 'call'; }> {
    return {
        node: callExpression(callee, args),
        type: 'call'
    };
}

suite('callback handling reported nodes', function () {
    test('getCodeAfterCallbackHandlingNode() reports non-callback operations after the callback', function () {
        const sourceCode = createSourceCode();
        const state = createPathState();
        const laterNode = identifier('laterStatement');
        const laterBindingAssignment = bindingAssignment(laterNode, 'finish', literal(0));
        const callbackCall = callOperation(identifier('done'), []);

        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, laterBindingAssignment), laterNode);
        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, callbackCall), undefined);
    });

    test('getCodeAfterCallbackHandlingNode() treats unsupported and untracked member calls as later code', function () {
        const sourceCode = createSourceCode();
        const state = createPathState();
        const unsupportedCall = callOperation(
            memberExpression(callExpression(identifier('getCallbacks'), []), identifier('complete')),
            []
        );
        const untrackedCall = callOperation(memberExpression(identifier('callbacks'), identifier('complete')), []);

        assert.strictEqual(
            getCodeAfterCallbackHandlingNode(sourceCode, state, unsupportedCall),
            unsupportedCall.node
        );
        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, untrackedCall), untrackedCall.node);
    });

    test('getCodeAfterCallbackHandlingNode() treats dynamic delegate paths as later code', function () {
        const sourceCode = createSourceCode();
        const state = createPathState();
        const dynamicDelegateCall = callOperation(
            memberExpression(identifier('globalThis'), identifier('delegateName'), true),
            [ identifier('done') ]
        );

        assert.strictEqual(
            getCodeAfterCallbackHandlingNode(sourceCode, state, dynamicDelegateCall),
            dynamicDelegateCall.node
        );
    });
});
