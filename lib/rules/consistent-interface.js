import { createMochaVisitors } from '../ast/mochaVisitors.js';

export const consistentInterfaceRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces consistent use of mocha interfaces',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/consistent-interface.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    interface: {
                        type: 'string',
                        enum: ['BDD', 'TDD'],
                        default: 'BDD'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const interfaceToUse = context.options[0].interface;

        return createMochaVisitors(context, {
            anyTestEntity(visitorContext) {
                if (visitorContext.interface !== interfaceToUse) {
                    context.report({
                        node: visitorContext.node,
                        message: `Unexpected use of ${visitorContext.interface} interface instead of ${interfaceToUse}`
                    });
                }
            }
        });
    }
};
