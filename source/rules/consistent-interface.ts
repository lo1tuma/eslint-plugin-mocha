import type { AST, Rule, Scope, SourceCode } from 'eslint';
import type * as ESTree from 'estree';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
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

type InterfaceName = (typeof interfaces)[number];
type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { interface: InterfaceName; };
type ImportSpecifierNode = ESTree.ImportSpecifier;
type ImportDeclarationNode = ESTree.ImportDeclaration;
type MochaImportBinding = {
    importDeclaration: Readonly<ImportDeclarationNode>;
    specifier: Readonly<ImportSpecifierNode>;
};
type MochaImportDefinition = Extract<Scope.Definition, { type: 'ImportBinding'; }> & {
    node: ESTree.ImportSpecifier;
    parent: ESTree.ImportDeclaration;
};
type UnexpectedImportDescriptor = {
    readonly loc: AST.SourceLocation;
    readonly messageId: 'unexpectedInterface';
    readonly data: {
        readonly actualInterface: string;
        readonly expectedInterface: string;
    };
};

const defaultOption: ResolvedOption = { interface: 'BDD' };
const interfaceMethodNames = new Set([
    'describe',
    'context',
    'suite',
    'it',
    'specify',
    'test',
    'before',
    'after',
    'beforeEach',
    'afterEach',
    'suiteSetup',
    'suiteTeardown',
    'setup',
    'teardown'
]);

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

export function getMochaModuleScope(sourceCode: Readonly<SourceCode>): Readonly<Scope.Scope> | null {
    const { globalScope } = sourceCode.scopeManager;
    const maybeModuleScope = globalScope?.childScopes?.[0];

    return maybeModuleScope?.type === 'module' ? maybeModuleScope : null;
}

function isMochaImportDefinition(importDef: Readonly<Scope.Definition>): importDef is Readonly<MochaImportDefinition> {
    return importDef.type === 'ImportBinding' &&
        importDef.parent.source.value === 'mocha' &&
        importDef.node.type === 'ImportSpecifier';
}

export function getMochaImportBinding(variable: Readonly<Scope.Variable>): Readonly<MochaImportBinding> | null {
    const importDef = variable.defs[0];

    if (importDef === undefined || !isMochaImportDefinition(importDef)) {
        return null;
    }

    const specifier = importDef.parent.specifiers.find((currentSpecifier): currentSpecifier is ImportSpecifierNode => {
        return currentSpecifier.type === 'ImportSpecifier' &&
            currentSpecifier.local.name === variable.name;
    });

    if (specifier === undefined) {
        return null;
    }

    return {
        importDeclaration: importDef.parent,
        specifier
    };
}

export function getImportedName(specifier: Readonly<ImportSpecifierNode>): string | null {
    if (specifier.imported.type === 'Identifier') {
        return specifier.imported.name;
    }

    return typeof specifier.imported.value === 'string'
        ? specifier.imported.value
        : null;
}

function isInterfaceMethodImport(
    specifier: Readonly<ImportSpecifierNode>
): boolean {
    return specifier.imported.type === 'Identifier'
        ? interfaceMethodNames.has(specifier.imported.name)
        : interfaceMethodNames.has(String(specifier.imported.value));
}

function isCanonicalNamedImportSpecifier(specifier: Readonly<ImportSpecifierNode>): boolean {
    if (specifier.imported.type !== 'Identifier') {
        return false;
    }

    return specifier.local.name === specifier.imported.name;
}

function isFixableImportSpecifier(specifier: Readonly<ImportSpecifierNode>): boolean {
    return isCanonicalNamedImportSpecifier(specifier) && isInterfaceMethodImport(specifier);
}

function isAutoFixableImportSpecifier(
    specifier: Readonly<ImportSpecifierNode>,
    importDeclaration: Readonly<ImportDeclarationNode>
): boolean {
    return isCanonicalNamedImportSpecifier(specifier) &&
        importDeclaration.specifiers.every((currentSpecifier) => {
            return currentSpecifier.type === 'ImportSpecifier';
        });
}

function getNamedImportSpecifiers(
    importDeclaration: Readonly<ImportDeclarationNode>
): readonly ImportSpecifierNode[] {
    return importDeclaration.specifiers.filter((currentSpecifier): currentSpecifier is ImportSpecifierNode => {
        return currentSpecifier.type === 'ImportSpecifier';
    });
}

export function removeFullImportDeclaration(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    importDeclaration: Readonly<ImportDeclarationNode>
): Readonly<Rule.Fix | null> {
    if (importDeclaration.range === undefined) {
        return null;
    }

    const nextToken = sourceCode.getTokenAfter(importDeclaration);

    return nextToken === null
        ? fixer.removeRange(importDeclaration.range)
        : fixer.removeRange([importDeclaration.range[0], nextToken.range[0]]);
}

function shouldRemoveFullImportDeclaration(importDeclaration: Readonly<ImportDeclarationNode>): boolean {
    return importDeclaration.specifiers.length > 0 &&
        importDeclaration.specifiers.every((currentSpecifier): currentSpecifier is ImportSpecifierNode => {
            return currentSpecifier.type === 'ImportSpecifier' && isFixableImportSpecifier(currentSpecifier);
        });
}

function getRangeBeforeNextSpecifier(
    specifier: Readonly<ImportSpecifierNode>,
    nextSpecifier: Readonly<ImportSpecifierNode | undefined>
): AST.Range | null {
    return nextSpecifier?.range === undefined || specifier.range === undefined
        ? null
        : [specifier.range[0], nextSpecifier.range[0]];
}

function getRangeAfterPreviousSpecifier(
    previousSpecifier: Readonly<ImportSpecifierNode | undefined>,
    specifier: Readonly<ImportSpecifierNode>
): AST.Range | null {
    return previousSpecifier?.range === undefined || specifier.range === undefined
        ? null
        : [previousSpecifier.range[1], specifier.range[1]];
}

export function getImportSpecifierRemovalRange(
    specifier: Readonly<ImportSpecifierNode>,
    specifiers: readonly ImportSpecifierNode[]
): AST.Range | null {
    const index = specifiers.indexOf(specifier);
    if (index === -1) {
        return null;
    }

    if (index === 0) {
        return getRangeBeforeNextSpecifier(specifier, specifiers[1]);
    }

    return getRangeAfterPreviousSpecifier(specifiers[index - 1], specifier);
}

export function fixImportSpecifier(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    specifier: Readonly<ImportSpecifierNode>,
    importDeclaration: Readonly<ImportDeclarationNode>
): Readonly<Rule.Fix | null> {
    if (shouldRemoveFullImportDeclaration(importDeclaration)) {
        return removeFullImportDeclaration(fixer, sourceCode, importDeclaration);
    }

    const specifiers = getNamedImportSpecifiers(importDeclaration);
    const removalRange = getImportSpecifierRemovalRange(specifier, specifiers);

    return removalRange === null ? null : fixer.removeRange(removalRange);
}

export function createUnexpectedImportDescriptor(
    binding: Readonly<MochaImportBinding>,
    configuredMochaInterface: InterfaceName
): UnexpectedImportDescriptor | null {
    const { importDeclaration, specifier } = binding;
    const loc = specifier.local.loc ?? specifier.loc ?? importDeclaration.loc;

    return loc === null || loc === undefined
        ? null
        : {
            loc,
            messageId: 'unexpectedInterface',
            data: {
                actualInterface: 'require',
                expectedInterface: `global ${configuredMochaInterface}`
            }
        };
}

export function reportUnexpectedImportBinding(
    context: Readonly<Rule.RuleContext>,
    binding: Readonly<MochaImportBinding>,
    configuredMochaInterface: InterfaceName
): void {
    if (!isInterfaceMethodImport(binding.specifier)) {
        return;
    }

    const descriptor = createUnexpectedImportDescriptor(binding, configuredMochaInterface);
    if (descriptor === null) {
        return;
    }

    const { importDeclaration, specifier } = binding;

    if (isAutoFixableImportSpecifier(specifier, importDeclaration)) {
        context.report({
            ...descriptor,
            fix(fixer) {
                return fixImportSpecifier(fixer, context.sourceCode, specifier, importDeclaration);
            }
        });
        return;
    }

    context.report(descriptor);
}

export function reportUnexpectedImportBindingsInModule(
    context: Readonly<Rule.RuleContext>,
    configuredMochaInterface: InterfaceName
): void {
    const moduleScope = getMochaModuleScope(context.sourceCode);
    if (moduleScope === null) {
        return;
    }

    for (const variable of moduleScope.variables) {
        const binding = getMochaImportBinding(variable);

        if (binding !== null && variable.references.length > 0) {
            reportUnexpectedImportBinding(context, binding, configuredMochaInterface);
        }
    }
}

export const consistentInterfaceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Enforces consistent use of mocha interfaces',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/consistent-interface.md'
        },
        defaultOptions: [defaultOption],
        fixable: 'code',
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
                if (configuredMochaInterface === 'require') {
                    return;
                }

                reportUnexpectedImportBindingsInModule(context, configuredMochaInterface);
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
            }, {
                includeAllInterfaces: true
            })
        };
    }
};
