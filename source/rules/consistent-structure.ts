import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import {
    type AnyFunction,
    getParentNode,
    isBlockStatement,
    isFunction,
    isMemberExpression,
    isProgram,
    type Program
} from '../ast/node-types.js';
import { getLastOrThrow } from '../list.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
    type: 'object',
    properties: {
        order: {
            type: 'string',
            enum: ['hooks-tests-suites', 'off']
        },
        disallowDuplicateHooks: {
            type: 'boolean'
        },
        disallowMixedTestsAndSuites: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & {
    disallowDuplicateHooks: boolean;
    order: 'hooks-tests-suites' | 'off';
    disallowMixedTestsAndSuites: boolean;
};
type StructureEntityKind = 'hook' | 'suite' | 'testCase';
type StructureLayer = {
    hasReportedMixedStructure: boolean;
    hasSeenSuite: boolean;
    hasSeenTestCase: boolean;
    highestSeenKind: StructureEntityKind | null;
    scopeNode: AnyFunction['body'] | Program;
    usedHookNames: Set<string>;
};
type DirectStructureContext = {
    currentKind: StructureEntityKind;
    currentLayer: Readonly<StructureLayer>;
};
type TrackedStructureContext = DirectStructureContext & {
    visitorContext: Readonly<VisitorContext>;
};
type StructureTrackingOptions = Pick<ResolvedOption, 'disallowDuplicateHooks' | 'disallowMixedTestsAndSuites'>;

const defaultOption: ResolvedOption = {
    disallowDuplicateHooks: false,
    order: 'off',
    disallowMixedTestsAndSuites: false
};
const entityRank: Readonly<Record<StructureEntityKind, number>> = {
    hook: 0,
    testCase: 1,
    suite: 2
};

function createStructureLayer(scopeNode: StructureLayer['scopeNode']): Readonly<StructureLayer> {
    return {
        hasReportedMixedStructure: false,
        hasSeenSuite: false,
        hasSeenTestCase: false,
        highestSeenKind: null,
        scopeNode,
        usedHookNames: new Set()
    };
}

export function isNestedStatementBoundary(node: Rule.Node): boolean {
    return node.type.endsWith('Statement') || node.type.endsWith('Declaration') || isFunction(node);
}

function isDirectStatementInScope(scopeNode: StructureLayer['scopeNode'], node: Rule.Node): boolean {
    let current = node;

    while (getParentNode(current) !== scopeNode) {
        current = getParentNode(current);
        if (
            isNestedStatementBoundary(current) &&
            !(current.type === 'ExpressionStatement' && getParentNode(current) === scopeNode)
        ) {
            return false;
        }
    }

    return current.type === 'ExpressionStatement';
}

export function getTopLevelMochaExpression(node: Rule.Node): Rule.Node {
    const parent = getParentNode(node);

    if (isMemberExpression(parent)) {
        return getTopLevelMochaExpression(parent);
    }

    return node;
}

export function getStructureEntityKind(visitorContext: Readonly<VisitorContext>): StructureEntityKind {
    if (visitorContext.type === 'suite' || visitorContext.type === 'testCase' || visitorContext.type === 'hook') {
        return visitorContext.type;
    }

    throw new Error(`Unexpected mocha entity type: ${visitorContext.type}`);
}

function reportUnexpectedOrder(
    context: Readonly<Rule.RuleContext>,
    visitorContext: Readonly<VisitorContext>,
    highestSeenKind: StructureEntityKind
): void {
    const currentKind = getStructureEntityKind(visitorContext);

    if (currentKind === 'hook') {
        context.report({
            node: visitorContext.node,
            messageId: highestSeenKind === 'suite'
                ? 'unexpectedHookAfterSuite'
                : 'unexpectedHookAfterTest'
        });
        return;
    }

    if (currentKind === 'testCase' && highestSeenKind === 'suite') {
        context.report({
            node: visitorContext.node,
            messageId: 'unexpectedTestAfterSuite'
        });
    }
}

function getHighestSeenKind(
    highestSeenKind: StructureEntityKind | null,
    currentKind: StructureEntityKind
): StructureEntityKind {
    if (highestSeenKind === null || entityRank[currentKind] > entityRank[highestSeenKind]) {
        return currentKind;
    }

    return highestSeenKind;
}

function hasUnexpectedOrder(
    configuredOrder: ResolvedOption['order'],
    highestSeenKind: StructureEntityKind | null,
    currentKind: StructureEntityKind
): highestSeenKind is StructureEntityKind {
    return configuredOrder === 'hooks-tests-suites' &&
        highestSeenKind !== null &&
        entityRank[currentKind] < entityRank[highestSeenKind];
}

function shouldReportMixedStructure(layer: Readonly<StructureLayer>, currentKind: StructureEntityKind): boolean {
    return !layer.hasReportedMixedStructure &&
        (
            (currentKind === 'suite' && layer.hasSeenTestCase) ||
            (currentKind === 'testCase' && layer.hasSeenSuite)
        );
}

function shouldReportDuplicateHook(
    layer: Readonly<StructureLayer>,
    currentKind: StructureEntityKind,
    visitorContext: Readonly<VisitorContext>
): boolean {
    return currentKind === 'hook' && layer.usedHookNames.has(visitorContext.name);
}

function isSuiteBodyLayer(layer: Readonly<StructureLayer>): boolean {
    return !isProgram(layer.scopeNode);
}

function createTrackedLayer(
    layer: Readonly<StructureLayer>,
    currentKind: StructureEntityKind,
    visitorContext: Readonly<VisitorContext>,
    hasReportedMixedStructure: boolean
): Readonly<StructureLayer> {
    const usedHookNames = new Set(layer.usedHookNames);

    if (currentKind === 'hook') {
        usedHookNames.add(visitorContext.name);
    }

    return {
        hasReportedMixedStructure: layer.hasReportedMixedStructure || hasReportedMixedStructure,
        hasSeenSuite: layer.hasSeenSuite || currentKind === 'suite',
        hasSeenTestCase: layer.hasSeenTestCase || currentKind === 'testCase',
        highestSeenKind: getHighestSeenKind(layer.highestSeenKind, currentKind),
        scopeNode: layer.scopeNode,
        usedHookNames
    };
}

function replaceCurrentLayer(layers: StructureLayer[], nextLayer: Readonly<StructureLayer>): void {
    layers.splice(-1, 1, nextLayer);
}

export function getDirectStructureContext(
    layers: readonly StructureLayer[],
    visitorContext: Readonly<VisitorContext>
): Readonly<DirectStructureContext> | null {
    if (layers.length === 0) {
        return null;
    }

    const currentLayer = getLastOrThrow(layers);

    if (!isDirectStatementInScope(currentLayer.scopeNode, getTopLevelMochaExpression(visitorContext.node))) {
        return null;
    }

    return {
        currentKind: getStructureEntityKind(visitorContext),
        currentLayer
    };
}

function reportMixedStructure(context: Readonly<Rule.RuleContext>, visitorContext: Readonly<VisitorContext>): void {
    context.report({
        node: visitorContext.node,
        messageId: 'unexpectedMixedTestsAndSuites'
    });
}

function reportDuplicateHook(context: Readonly<Rule.RuleContext>, visitorContext: Readonly<VisitorContext>): void {
    context.report({
        node: visitorContext.node,
        messageId: 'unexpectedDuplicateHook',
        data: { name: visitorContext.name }
    });
}

function trackStructureLayer(
    context: Readonly<Rule.RuleContext>,
    layers: StructureLayer[],
    trackedStructureContext: Readonly<TrackedStructureContext>,
    options: Readonly<StructureTrackingOptions>
): void {
    const { currentKind, currentLayer, visitorContext } = trackedStructureContext;
    const { disallowDuplicateHooks, disallowMixedTestsAndSuites } = options;
    const reportsMixedStructure = isSuiteBodyLayer(currentLayer) &&
        disallowMixedTestsAndSuites &&
        shouldReportMixedStructure(currentLayer, currentKind);
    const reportsDuplicateHook = disallowDuplicateHooks &&
        shouldReportDuplicateHook(currentLayer, currentKind, visitorContext);

    if (reportsMixedStructure) {
        reportMixedStructure(context, visitorContext);
    }

    if (reportsDuplicateHook) {
        reportDuplicateHook(context, visitorContext);
    }

    replaceCurrentLayer(layers, createTrackedLayer(currentLayer, currentKind, visitorContext, reportsMixedStructure));
}

export const consistentStructureRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Require consistent structure for Mocha test entities',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/consistent-structure.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedHookAfterSuite: 'Unexpected hook after a child suite.',
            unexpectedHookAfterTest: 'Unexpected hook after a test case.',
            unexpectedDuplicateHook: 'Unexpected use of duplicate Mocha `{{name}}` hook',
            unexpectedMixedTestsAndSuites: 'Unexpected mix of test cases and child suites at the same level.',
            unexpectedTestAfterSuite: 'Unexpected test case after a child suite.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { order, disallowDuplicateHooks, disallowMixedTestsAndSuites } = getRuleOption<ResolvedOption>(context);
        const layers: StructureLayer[] = [];

        function registerStructure(visitorContext: Readonly<VisitorContext>): void {
            const directStructureContext = getDirectStructureContext(layers, visitorContext);

            if (directStructureContext === null) {
                return;
            }

            const { currentKind, currentLayer } = directStructureContext;
            const { highestSeenKind } = currentLayer;

            if (isSuiteBodyLayer(currentLayer) && hasUnexpectedOrder(order, highestSeenKind, currentKind)) {
                reportUnexpectedOrder(context, visitorContext, highestSeenKind);
            }

            trackStructureLayer(
                context,
                layers,
                { ...directStructureContext, visitorContext },
                { disallowDuplicateHooks, disallowMixedTestsAndSuites }
            );
        }

        return createMochaVisitors(context, {
            Program(node) {
                layers.push(createStructureLayer(node));
            },

            'Program:exit'() {
                layers.pop();
            },

            suite(visitorContext) {
                registerStructure(visitorContext);
            },

            suiteCallback(visitorContext) {
                const { node } = visitorContext;

                if (isFunction(node) && isBlockStatement(node.body)) {
                    layers.push(createStructureLayer(node.body));
                }
            },

            'suiteCallback:exit'(visitorContext) {
                const { node } = visitorContext;

                if (isFunction(node) && isBlockStatement(node.body)) {
                    layers.pop();
                }
            },

            testCase(visitorContext) {
                registerStructure(visitorContext);
            },

            hook(visitorContext) {
                registerStructure(visitorContext);
            }
        });
    }
};
