import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import {
    type AnyFunction,
    isBlockStatement,
    isFunction,
    isProgram,
    type Program
} from '../ast/node-types.js';
import { getLastOrThrow } from '../list.js';
import { getRuleOption, type InferSchemaOption } from '../rule-options.js';
import {
    getTopLevelMochaExpression as getDirectTopLevelMochaExpression,
    isDirectStatementInScope
} from './direct-mocha-statement.js';

const optionSchema = {
    type: 'object',
    properties: {
        hookOrder: {
            type: 'string',
            enum: [ 'setup-teardown', 'off' ]
        },
        order: {
            type: 'string',
            enum: [ 'hooks-tests-suites', 'off' ]
        },
        disallowDuplicateHooks: {
            type: 'boolean'
        },
        disallowMixedTestsAndSuites: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & {
    readonly disallowDuplicateHooks: boolean;
    readonly hookOrder: 'off' | 'setup-teardown';
    readonly order: 'hooks-tests-suites' | 'off';
    readonly disallowMixedTestsAndSuites: boolean;
};
type StructureEntityKind = 'hook' | 'suite' | 'testCase';
type StructureLayer = {
    readonly hasReportedMixedStructure: boolean;
    readonly hasSeenSuite: boolean;
    readonly hasSeenTestCase: boolean;
    readonly highestSeenHookOrderName: string | null;
    readonly highestSeenHookOrderRank: number | null;
    readonly highestSeenKind: StructureEntityKind | null;
    readonly scopeNode: AnyFunction['body'] | Program;
    readonly usedHookNames: ReadonlySet<string>;
};
type DirectStructureContext = {
    readonly currentKind: StructureEntityKind;
    readonly currentLayer: Readonly<StructureLayer>;
};
type TrackedStructureContext = DirectStructureContext & {
    readonly visitorContext: Readonly<VisitorContext>;
};
type StructureTrackingOptions = Pick<
    ResolvedOption,
    'disallowDuplicateHooks' | 'disallowMixedTestsAndSuites' | 'hookOrder'
>;

const defaultOption: ResolvedOption = {
    disallowDuplicateHooks: false,
    hookOrder: 'off',
    order: 'off',
    disallowMixedTestsAndSuites: false
};
const entityRank: Readonly<Record<StructureEntityKind, number>> = {
    hook: 0,
    testCase: 1,
    suite: 2
};
const hookOrderRank: Readonly<Record<string, number>> = {
    'before()': 0,
    'suiteSetup()': 0,
    'beforeEach()': 1,
    'setup()': 1,
    'afterEach()': 2,
    'teardown()': 2,
    'after()': 3,
    'suiteTeardown()': 3
};

function createStructureLayer(scopeNode: Readonly<StructureLayer['scopeNode']>): Readonly<StructureLayer> {
    return {
        hasReportedMixedStructure: false,
        hasSeenSuite: false,
        hasSeenTestCase: false,
        highestSeenHookOrderName: null,
        highestSeenHookOrderRank: null,
        highestSeenKind: null,
        scopeNode,
        usedHookNames: new Set()
    };
}

function reportUnexpectedOrder(
    context: Readonly<Rule.RuleContext>,
    visitorContext: Readonly<VisitorContext>,
    highestSeenKind: StructureEntityKind,
    currentKind: StructureEntityKind
): void {
    if (currentKind === 'hook') {
        context.report({
            node: visitorContext.node,
            messageId: highestSeenKind === 'suite'
                ? 'unexpectedHookAfterSuite'
                : 'unexpectedHookAfterTest'
        });
        return;
    }

    context.report({
        node: visitorContext.node,
        messageId: 'unexpectedTestAfterSuite'
    });
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
            currentKind === 'suite' && layer.hasSeenTestCase ||
            currentKind === 'testCase' && layer.hasSeenSuite
        );
}

function shouldReportDuplicateHook(
    layer: Readonly<StructureLayer>,
    currentKind: StructureEntityKind,
    visitorContext: Readonly<VisitorContext>
): boolean {
    return currentKind === 'hook' && layer.usedHookNames.has(visitorContext.name);
}

type OrderedHook = {
    readonly name: string;
    readonly rank: number;
};

function getTerminalName(name: string): string {
    return name.slice(name.lastIndexOf('.') + 1);
}

function getOrderedHook(name: string): Readonly<OrderedHook> | null {
    const rank = hookOrderRank[getTerminalName(name)];

    if (rank === undefined) {
        return null;
    }

    return { name, rank };
}

function reportUnexpectedHookOrder(
    context: Readonly<Rule.RuleContext>,
    visitorContext: Readonly<VisitorContext>,
    previousHook: string
): void {
    context.report({
        node: visitorContext.node,
        messageId: 'unexpectedHookOrder',
        data: { currentHook: visitorContext.name, previousHook }
    });
}

function getTrackedOrderedHook(
    currentKind: StructureEntityKind,
    visitorContext: Readonly<VisitorContext>
): Readonly<OrderedHook> | null {
    if (currentKind !== 'hook') {
        return null;
    }

    return getOrderedHook(visitorContext.name);
}

function shouldReportHookOrder(
    layer: Readonly<StructureLayer>,
    hookOrder: ResolvedOption['hookOrder'],
    orderedHook: Readonly<OrderedHook> | null
): orderedHook is OrderedHook {
    return hookOrder === 'setup-teardown' &&
        orderedHook !== null &&
        layer.highestSeenHookOrderRank !== null &&
        orderedHook.rank < layer.highestSeenHookOrderRank;
}

function isSuiteBodyLayer(layer: Readonly<StructureLayer>): boolean {
    return !isProgram(layer.scopeNode);
}

function shouldRememberHighestSeenHookOrder(
    layer: Readonly<StructureLayer>,
    orderedHook: Readonly<OrderedHook> | null
): orderedHook is OrderedHook {
    return orderedHook !== null &&
        (layer.highestSeenHookOrderRank === null || orderedHook.rank > layer.highestSeenHookOrderRank);
}

function getUsedHookNames(
    layer: Readonly<StructureLayer>,
    currentKind: StructureEntityKind,
    visitorContext: Readonly<VisitorContext>
): Readonly<Set<string>> {
    const usedHookNames = new Set(layer.usedHookNames);

    if (currentKind === 'hook') {
        usedHookNames.add(visitorContext.name);
    }

    return usedHookNames;
}

function getTrackedOrderedHookForLayer(
    trackedStructureContext: Readonly<TrackedStructureContext>,
    hookOrder: ResolvedOption['hookOrder']
): Readonly<OrderedHook> | null {
    return hookOrder === 'setup-teardown'
        ? getTrackedOrderedHook(trackedStructureContext.currentKind, trackedStructureContext.visitorContext)
        : null;
}

function createTrackedLayer(
    layer: Readonly<StructureLayer>,
    trackedStructureContext: Readonly<TrackedStructureContext>,
    hasReportedMixedStructure: boolean,
    hookOrder: ResolvedOption['hookOrder']
): Readonly<StructureLayer> {
    const { currentKind, visitorContext } = trackedStructureContext;
    const trackedOrderedHook = getTrackedOrderedHookForLayer(trackedStructureContext, hookOrder);
    const remembersHighestSeenHookOrder = shouldRememberHighestSeenHookOrder(layer, trackedOrderedHook);

    return {
        hasReportedMixedStructure: layer.hasReportedMixedStructure || hasReportedMixedStructure,
        hasSeenSuite: layer.hasSeenSuite || currentKind === 'suite',
        hasSeenTestCase: layer.hasSeenTestCase || currentKind === 'testCase',
        highestSeenHookOrderName: remembersHighestSeenHookOrder
            ? trackedOrderedHook.name
            : layer.highestSeenHookOrderName,
        highestSeenHookOrderRank: remembersHighestSeenHookOrder
            ? trackedOrderedHook.rank
            : layer.highestSeenHookOrderRank,
        highestSeenKind: getHighestSeenKind(layer.highestSeenKind, currentKind),
        scopeNode: layer.scopeNode,
        usedHookNames: getUsedHookNames(layer, currentKind, visitorContext)
    };
}

function replaceCurrentLayer(
    layers: readonly StructureLayer[],
    nextLayer: Readonly<StructureLayer>
): readonly StructureLayer[] {
    return [ ...layers.slice(0, -1), nextLayer ];
}

function getDirectStructureContext(
    layers: readonly StructureLayer[],
    visitorContext: Readonly<VisitorContext>,
    currentKind: StructureEntityKind
): Readonly<DirectStructureContext> | null {
    const currentLayer = getLastOrThrow(layers);

    if (!isDirectStatementInScope(currentLayer.scopeNode, getDirectTopLevelMochaExpression(visitorContext.node))) {
        return null;
    }

    return {
        currentKind,
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

function reportMixedStructureIfNeeded(
    context: Readonly<Rule.RuleContext>,
    trackedStructureContext: Readonly<TrackedStructureContext>,
    disallowMixedTestsAndSuites: boolean
): boolean {
    const { currentKind, currentLayer, visitorContext } = trackedStructureContext;
    const shouldReport = isSuiteBodyLayer(currentLayer) &&
        disallowMixedTestsAndSuites &&
        shouldReportMixedStructure(currentLayer, currentKind);

    if (shouldReport) {
        reportMixedStructure(context, visitorContext);
    }

    return shouldReport;
}

function reportDuplicateHookIfNeeded(
    context: Readonly<Rule.RuleContext>,
    trackedStructureContext: Readonly<TrackedStructureContext>,
    disallowDuplicateHooks: boolean
): void {
    const { currentKind, currentLayer, visitorContext } = trackedStructureContext;

    if (disallowDuplicateHooks && shouldReportDuplicateHook(currentLayer, currentKind, visitorContext)) {
        reportDuplicateHook(context, visitorContext);
    }
}

function reportUnexpectedHookOrderIfNeeded(
    context: Readonly<Rule.RuleContext>,
    trackedStructureContext: Readonly<TrackedStructureContext>,
    hookOrder: ResolvedOption['hookOrder']
): void {
    const { currentKind, currentLayer, visitorContext } = trackedStructureContext;

    if (
        hookOrder === 'off' ||
        currentLayer.highestSeenHookOrderName === null ||
        currentLayer.highestSeenHookOrderRank === null
    ) {
        return;
    }

    const orderedHook = getTrackedOrderedHook(currentKind, visitorContext);

    if (shouldReportHookOrder(currentLayer, hookOrder, orderedHook)) {
        reportUnexpectedHookOrder(context, visitorContext, currentLayer.highestSeenHookOrderName);
    }
}

function trackStructureLayer(
    context: Readonly<Rule.RuleContext>,
    layers: readonly StructureLayer[],
    trackedStructureContext: Readonly<TrackedStructureContext>,
    options: Readonly<StructureTrackingOptions>
): readonly StructureLayer[] {
    const { currentLayer } = trackedStructureContext;
    const { disallowDuplicateHooks, disallowMixedTestsAndSuites, hookOrder } = options;
    const reportsMixedStructure = reportMixedStructureIfNeeded(
        context,
        trackedStructureContext,
        disallowMixedTestsAndSuites
    );

    reportDuplicateHookIfNeeded(context, trackedStructureContext, disallowDuplicateHooks);
    reportUnexpectedHookOrderIfNeeded(context, trackedStructureContext, hookOrder);
    return replaceCurrentLayer(
        layers,
        createTrackedLayer(currentLayer, trackedStructureContext, reportsMixedStructure, hookOrder)
    );
}

export const consistentStructureRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require consistent structure for Mocha test entities',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/consistent-structure.md'
        },
        schema: [ optionSchema ],
        defaultOptions: [ defaultOption ],
        messages: {
            unexpectedHookAfterSuite: 'Unexpected hook after a child suite.',
            unexpectedHookAfterTest: 'Unexpected hook after a test case.',
            unexpectedDuplicateHook: 'Unexpected use of duplicate Mocha `{{name}}` hook',
            unexpectedHookOrder: 'Unexpected Mocha `{{currentHook}}` hook after `{{previousHook}}` hook.',
            unexpectedMixedTestsAndSuites: 'Unexpected mix of test cases and child suites at the same level.',
            unexpectedTestAfterSuite: 'Unexpected test case after a child suite.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        const { order, disallowDuplicateHooks, disallowMixedTestsAndSuites, hookOrder } = getRuleOption<
            ResolvedOption
        >(context);
        let layers: readonly StructureLayer[] = [];

        function registerStructure(visitorContext: Readonly<VisitorContext>, currentKind: StructureEntityKind): void {
            const directStructureContext = getDirectStructureContext(layers, visitorContext, currentKind);

            if (directStructureContext === null) {
                return;
            }

            const { currentKind: directKind, currentLayer } = directStructureContext;
            const { highestSeenKind } = currentLayer;

            if (isSuiteBodyLayer(currentLayer) && hasUnexpectedOrder(order, highestSeenKind, directKind)) {
                reportUnexpectedOrder(context, visitorContext, highestSeenKind, directKind);
            }

            layers = trackStructureLayer(
                context,
                layers,
                { ...directStructureContext, visitorContext },
                { disallowDuplicateHooks, disallowMixedTestsAndSuites, hookOrder }
            );
        }

        return createMochaVisitors(context, {
            Program(node) {
                layers = [ ...layers, createStructureLayer(node) ];
            },

            'Program:exit'() {
                layers = layers.slice(0, -1);
            },

            suite(visitorContext) {
                registerStructure(visitorContext, 'suite');
            },

            suiteCallback(visitorContext) {
                const { node } = visitorContext;

                if (isFunction(node) && isBlockStatement(node.body)) {
                    layers = [ ...layers, createStructureLayer(node.body) ];
                }
            },

            'suiteCallback:exit'(visitorContext) {
                const { node } = visitorContext;

                if (isFunction(node) && isBlockStatement(node.body)) {
                    layers = layers.slice(0, -1);
                }
            },

            testCase(visitorContext) {
                registerStructure(visitorContext, 'testCase');
            },

            hook(visitorContext) {
                registerStructure(visitorContext, 'hook');
            }
        });
    }
};
