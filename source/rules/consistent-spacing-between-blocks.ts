import type { AST, Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.ts';
import { expectNodeRange } from '../ast/node-location.ts';
import { type BlockStatement, isBlockStatement, type Program } from '../ast/node-types.ts';
import { getLastOrThrow } from '../list.ts';
import { getTopLevelMochaExpression, isDirectStatementInScope } from './direct-mocha-statement.ts';

const minimumAmountOfLinesBetweenNeeded = 2;

function containsNode(
    nodeA: Readonly<Except<Rule.Node, 'parent'>>,
    nodeB: Readonly<Except<Rule.Node, 'parent'>>
): boolean {
    const rangeA = expectNodeRange(nodeA);
    const rangeB = expectNodeRange(nodeB);

    return rangeB[1] <= rangeA[1] && rangeB[0] >= rangeA[0];
}

function isFirstStatementInScope(scopeNode: Layer['scopeNode'], node: Readonly<Rule.Node>): boolean {
    const [ firstNode ] = scopeNode.body;

    return firstNode === undefined || containsNode(firstNode, node);
}

type Layer = {
    readonly entities: readonly EntityLocation[];
    readonly scopeNode: Readonly<BlockStatement | Program>;
};

type EntityLocation = {
    readonly reportNode: VisitorContext['node'];
    readonly statementNode: Rule.Node;
    readonly beforeToken: Readonly<AST.Token> | null;
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
        docs: {
            description: 'Require consistent spacing between blocks',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/' +
                'consistent-spacing-between-blocks.md'
        },
        fixable: 'whitespace',
        schema: [],
        messages: {
            expectedLineBreak: 'Expected line break before this statement.'
        },
        languages: [ 'js/js' ]
    },

    create(context) {
        const layers: Layer[] = [];
        const { sourceCode } = context;

        function addEntityToCurrentLayer(visitorContext: Readonly<VisitorContext>): void {
            const currentLayer = getLastOrThrow(layers);
            if (isDirectStatementInScope(currentLayer.scopeNode, visitorContext.node)) {
                const statementNode = getTopLevelMochaExpression(visitorContext.node);
                layers[layers.length - 1] = {
                    ...currentLayer,
                    entities: [
                        ...currentLayer.entities,
                        {
                            reportNode: visitorContext.node,
                            statementNode,
                            beforeToken: sourceCode.getTokenBefore(statementNode, { includeComments: false })
                        }
                    ]
                };
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
                if (isBlockStatement(node.body)) {
                    layers.push({ entities: [], scopeNode: node.body });
                }
            },

            'suiteCallback:exit'(visitorContext) {
                if (isBlockStatement(visitorContext.node.body)) {
                    checkCurrentLayer();
                    layers.pop();
                }
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
