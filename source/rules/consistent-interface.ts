import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const consistentInterfaceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces consistent use of mocha interfaces',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/consistent-interface.md'
        },
        defaultOptions: [{ interface: 'BDD' }],
        messages: {
            unexpectedInterface: 'Unexpected use of {{actualInterface}} interface instead of {{expectedInterface}}'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    interface: {
                        type: 'string',
                        enum: ['BDD', 'TDD']
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- schema validation and defaultOptions guarantee the option shape
        const [{ interface: interfaceToUse }] = context.options as [{ interface: string; }];

        return createMochaVisitors(context, {
            anyTestEntity(visitorContext) {
                if (visitorContext.interface !== interfaceToUse) {
                    context.report({
                        node: visitorContext.node,
                        messageId: 'unexpectedInterface',
                        data: {
                            actualInterface: visitorContext.interface,
                            expectedInterface: interfaceToUse
                        }
                    });
                }
            }
        });
    }
};
