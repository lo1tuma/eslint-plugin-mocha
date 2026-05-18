import type { Rule } from 'eslint';
import { findMochaVariableCalls } from '../ast/find-mocha-variable-calls.js';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { getAllNames } from '../mocha/all-name-details.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';
import { getInterface } from '../settings.js';

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
const builtinMochaNames = getAllNames([]);

function reportUnexpectedInterface(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<Rule.Node>,
    actualInterface: string,
    expectedInterface: string
): void {
    context.report({
        node,
        messageId: 'unexpectedInterface',
        data: {
            actualInterface,
            expectedInterface
        }
    });
}

function reportUnexpectedExportsInterface(
    context: Readonly<Rule.RuleContext>,
    node: Readonly<Rule.Node>,
    expectedInterface: string
): void {
    context.report({
        node,
        messageId: 'unexpectedInterface',
        data: {
            actualInterface: 'exports',
            expectedInterface: `global ${expectedInterface}`
        }
    });
}

export const consistentInterfaceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces consistent use of mocha interfaces',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/consistent-interface.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedInterface: 'Unexpected use of {{actualInterface}} interface instead of {{expectedInterface}}'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { interface: interfaceToUse } = getRuleOption<ResolvedOption>(context);
        const configuredMochaInterface = getInterface(context.settings);

        return {
            Program() {
                if (configuredMochaInterface === 'exports') {
                    return;
                }

                const importedMochaInterfaceCalls = findMochaVariableCalls(context, builtinMochaNames, 'exports');

                for (const importedMochaInterfaceCall of importedMochaInterfaceCalls) {
                    reportUnexpectedExportsInterface(
                        context,
                        importedMochaInterfaceCall.node,
                        configuredMochaInterface
                    );
                }
            },
            ...createMochaVisitors(context, {
                anyTestEntity(visitorContext) {
                    if (visitorContext.interface !== interfaceToUse) {
                        reportUnexpectedInterface(
                            context,
                            visitorContext.node,
                            visitorContext.interface,
                            interfaceToUse
                        );
                    }
                }
            })
        };
    }
};
