import type { AST, Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { type AnyFunction, isBlockStatement, isFunction, isProgram, type Program } from '../ast/node-types.js';
import { getLastOrThrow } from '../list.js';
import { getTopLevelMochaExpression, isDirectStatementInScope } from './direct-mocha-statement.js';

const minimumAmountOfLinesBetweenNeeded = 2;

export function containsNode(nodeA: Except<Rule.Node, 'parent'>, nodeB: Except<Rule.Node, 'parent'>): boolean {
    const { range: rangeA } = nodeA;
    const { range: rangeB } = nodeB;
    if (rangeA === undefined || rangeB === undefined) {
        return false;
    }

    return rangeB[1] <= rangeA[1] && rangeB[0] >= rangeA[0];
}

export function isFirstStatementInScope(scopeNode: Layer['scopeNode'], node: Rule.Node): boolean {
    if (isBlockStatement(scopeNode) || isProgram(scopeNode)) {
        const [firstNode] = scopeNode.body;
        if (firstNode !== undefined) {
            return containsNode(firstNode, node);
        }
    }

    return containsNode(scopeNode, node);
}

type Layer = {
    entities: EntityLocation[];
    scopeNode: AnyFunction['body'] | Program;
};

type EntityLocation = {
    reportNode: VisitorContext['node'];
    statementNode: Rule.Node;
    beforeToken: Readonly<AST.Token> | null;
};

type SpacingCheck = {
    readonly beforeToken: Readonly<AST.Token>;
    readonly linesBetween: number;
    readonly reportNode: VisitorContext['node'];
};

function getSpacingCheck(
    currentLayer: Readonly<Layer>,
    entity: Readonly<EntityLocation>
): Readonly<SpacingCheck> | undefined {
    const { statementNode, beforeToken } = entity;
    const statementNodeLocation = statementNode.loc;
    if (
        isFirstStatementInScope(currentLayer.scopeNode, statementNode) ||
        beforeToken === null ||
        statementNodeLocation === null ||
        statementNodeLocation === undefined
    ) {
        return undefined;
    }

    return {
        beforeToken,
        linesBetween: statementNodeLocation.start.line - beforeToken.loc.end.line,
        reportNode: entity.reportNode
    };
}

export const consistentSpacingBetweenBlocksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        fixable: 'whitespace',
        schema: [],
        messages: {
            expectedLineBreak: 'Expected line break before this statement.'
        },
        docs: {
            description: 'Require consistent spacing between blocks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/' +
                'consistent-spacing-between-blocks.md'
        }
    },

    create(context) {
        const layers: Layer[] = [];
        const { sourceCode } = context;

        function addEntityToCurrentLayer(visitorContext: Readonly<VisitorContext>): void {
            const currentLayer = getLastOrThrow(layers);
            if (isDirectStatementInScope(currentLayer.scopeNode, visitorContext.node)) {
                const statementNode = getTopLevelMochaExpression(visitorContext.node);
                currentLayer.entities.push({
                    reportNode: visitorContext.node,
                    statementNode,
                    beforeToken: sourceCode.getTokenBefore(statementNode, { includeComments: false }) as (
                        Readonly<AST.Token> | null
                    )
                });
            }
        }

        function checkCurrentLayer(): void {
            const currentLayer = getLastOrThrow(layers);

            for (const entity of currentLayer.entities) {
                const spacingCheck = getSpacingCheck(currentLayer, entity);
                if (
                    spacingCheck !== undefined &&
                    spacingCheck.linesBetween < minimumAmountOfLinesBetweenNeeded
                ) {
                    context.report({
                        node: spacingCheck.reportNode,
                        messageId: 'expectedLineBreak',
                        fix(fixer) {
                            return fixer.insertTextAfter(
                                spacingCheck.beforeToken,
                                spacingCheck.linesBetween === 0 ? '\n\n' : '\n'
                            );
                        }
                    });
                }
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            },

            suiteCallback(visitorContext) {
                const { node } = visitorContext;
                if (isFunction(node)) {
                    layers.push({ entities: [], scopeNode: node.body });
                }
            },

            'suiteCallback:exit'() {
                checkCurrentLayer();
                layers.pop();
            },

            Program(node) {
                layers.push({ entities: [], scopeNode: node });
            },

            'Program:exit'() {
                checkCurrentLayer();
            },

            testCase(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            },

            hook(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            }
        });
    }
};
