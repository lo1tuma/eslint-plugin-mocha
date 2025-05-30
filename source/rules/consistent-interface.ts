import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isRecord } from '../record.js';

export const consistentInterfaceRule: Readonly<Rule.RuleModule> = {
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
        const options = isRecord(context.options[0]) ? context.options[0] : {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- we know that this is a string because of the schema validation
        const interfaceToUse = options.interface as string;

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
