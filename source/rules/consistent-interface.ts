import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const interfaces = ['BDD', 'TDD'] as const;
const optionSchema = {
    type: 'object',
    properties: {
        interface: {
            type: 'string',
            enum: interfaces
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { interface: (typeof interfaces)[number]; };
const defaultOption: ResolvedOption = { interface: 'BDD' };

export const consistentInterfaceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces consistent use of mocha interfaces',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/consistent-interface.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedInterface: 'Unexpected use of {{actualInterface}} interface instead of {{expectedInterface}}'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { interface: interfaceToUse } = getRuleOption<ResolvedOption>(context);

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
