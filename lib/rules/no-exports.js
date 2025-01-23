import { createMochaVisitors } from '../ast/mochaVisitors.js';
import { getNodeName } from '../util/ast.js';

export const noExportsRule = {
    meta: {
        docs: {
            description: 'Disallow exports from test files',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-exports.md'
        },
        messages: {
            unexpectedExport: 'Unexpected export from a test file'
        },
        type: 'suggestion',
        schema: []
    },
    create(context) {
        const exportNodes = [];
        let hasTestCase = false;

        function isCommonJsExport(node) {
            if (node.type === 'MemberExpression') {
                const name = getNodeName(node);

                return name === 'module.exports' || name.startsWith('exports.');
            }

            return false;
        }

        return createMochaVisitors(context, {
            'Program:exit'() {
                if (hasTestCase && exportNodes.length > 0) {
                    for (const node of exportNodes) {
                        context.report({ node, messageId: 'unexpectedExport' });
                    }
                }
            },

            anyTestEntity() {
                if (!hasTestCase) {
                    hasTestCase = true;
                }
            },

            'ExportNamedDeclaration, ExportDefaultDeclaration, ExportAllDeclaration'(
                node
            ) {
                exportNodes.push(node);
            },

            AssignmentExpression(node) {
                if (isCommonJsExport(node.left)) {
                    exportNodes.push(node);
                }
            }
        });
    }
};
