import type { AST, Rule, Scope, SourceCode } from 'eslint';
import type * as ESTree from 'estree';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { expectNodeLocation, expectNodeRange } from '../ast/node-location.js';
import { getLastOrThrow } from '../list.js';
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
type ImportDeclarationSpecifier = ImportDeclarationNode['specifiers'][number];
type NamedImportDeclarationNode = ImportDeclarationNode & {
    specifiers: readonly ImportSpecifierNode[];
};
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

function isImportedIdentifier(specifier: Readonly<ImportSpecifierNode>): specifier is Readonly<ImportSpecifierNode> & {
    imported: ESTree.Identifier;
} {
    return specifier.imported.type === 'Identifier';
}

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

function getMochaModuleScope(sourceCode: Readonly<SourceCode>): Readonly<Scope.Scope> | null {
    const { globalScope } = sourceCode.scopeManager;
    const maybeModuleScope = globalScope?.childScopes?.[0];

    return maybeModuleScope?.type === 'module' ? maybeModuleScope : null;
}

function isMochaImportDefinition(
    importDef: Readonly<Scope.Definition> | undefined
): importDef is Readonly<MochaImportDefinition> {
    return importDef?.type === 'ImportBinding' &&
        importDef.parent.source.value === 'mocha' &&
        importDef.node.type === 'ImportSpecifier';
}

function getMochaImportBinding(variable: Readonly<Scope.Variable>): Readonly<MochaImportBinding> | null {
    const importDef = variable.defs[0];

    if (!isMochaImportDefinition(importDef)) {
        return null;
    }

    return {
        importDeclaration: importDef.parent,
        specifier: importDef.node
    };
}

function isInterfaceMethodImport(
    specifier: Readonly<ImportSpecifierNode>
): boolean {
    return specifier.imported.type === 'Identifier'
        ? interfaceMethodNames.has(specifier.imported.name)
        : interfaceMethodNames.has(String(specifier.imported.value));
}

function isCanonicalNamedImportSpecifier(specifier: Readonly<ImportSpecifierNode>): boolean {
    return isImportedIdentifier(specifier) && specifier.local.name === specifier.imported.name;
}

function isImportSpecifier(
    specifier: Readonly<ImportDeclarationSpecifier>
): specifier is Readonly<ImportSpecifierNode> {
    return specifier.type === 'ImportSpecifier';
}

function isFixableImportSpecifier(specifier: Readonly<ImportSpecifierNode>): boolean {
    return isCanonicalNamedImportSpecifier(specifier) && isInterfaceMethodImport(specifier);
}

function hasOnlyNamedImportSpecifiers(
    importDeclaration: Readonly<ImportDeclarationNode>
): importDeclaration is Readonly<NamedImportDeclarationNode> {
    return importDeclaration.specifiers.every(isImportSpecifier);
}

function removeFullImportDeclaration(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    importDeclaration: Readonly<ImportDeclarationNode>
): Readonly<Rule.Fix | null> {
    const range = expectNodeRange(importDeclaration);
    const trailingSource = sourceCode.text.slice(range[1]);
    const nextTokenOffset = trailingSource.search(/\S/u);
    const nextRangeStart = range[1] + Math.max(nextTokenOffset, 0);

    return fixer.removeRange([range[0], nextRangeStart]);
}

function shouldRemoveFullImportDeclaration(importDeclaration: Readonly<ImportDeclarationNode>): boolean {
    return importDeclaration.specifiers.length > 0 &&
        importDeclaration.specifiers.every((currentSpecifier): currentSpecifier is Readonly<ImportSpecifierNode> => {
            return isImportSpecifier(currentSpecifier) && isFixableImportSpecifier(currentSpecifier);
        });
}

function getRangeBeforeNextSpecifier(
    specifier: Readonly<ImportSpecifierNode>,
    nextSpecifier: Readonly<ImportSpecifierNode>
): AST.Range {
    const specifierRange = expectNodeRange(specifier);
    const nextSpecifierRange = expectNodeRange(nextSpecifier);

    return [specifierRange[0], nextSpecifierRange[0]];
}

function getRangeAfterPreviousSpecifier(
    previousSpecifier: Readonly<ImportSpecifierNode>,
    specifier: Readonly<ImportSpecifierNode>
): AST.Range {
    const previousSpecifierRange = expectNodeRange(previousSpecifier);
    const specifierRange = expectNodeRange(specifier);

    return [previousSpecifierRange[1], specifierRange[1]];
}

function getImportSpecifierRemovalRange(
    specifier: Readonly<ImportSpecifierNode>,
    specifiers: readonly ImportSpecifierNode[]
): AST.Range {
    const index = specifiers.indexOf(specifier);

    if (index === 0) {
        return getRangeBeforeNextSpecifier(specifier, getLastOrThrow(specifiers.slice(1)));
    }

    return getRangeAfterPreviousSpecifier(getLastOrThrow(specifiers.slice(index - 1, index)), specifier);
}

function fixImportSpecifier(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    specifier: Readonly<ImportSpecifierNode>,
    importDeclaration: Readonly<NamedImportDeclarationNode>
): Readonly<Rule.Fix | null> {
    if (shouldRemoveFullImportDeclaration(importDeclaration)) {
        return removeFullImportDeclaration(fixer, sourceCode, importDeclaration);
    }

    return fixer.removeRange(getImportSpecifierRemovalRange(specifier, importDeclaration.specifiers));
}

function createUnexpectedImportDescriptor(
    binding: Readonly<MochaImportBinding>,
    configuredMochaInterface: InterfaceName
): UnexpectedImportDescriptor {
    const { specifier } = binding;
    const loc = expectNodeLocation(specifier.local);

    return {
        loc,
        messageId: 'unexpectedInterface',
        data: {
            actualInterface: 'require',
            expectedInterface: `global ${configuredMochaInterface}`
        }
    };
}

function reportUnexpectedImportBinding(
    context: Readonly<Rule.RuleContext>,
    binding: Readonly<MochaImportBinding>,
    configuredMochaInterface: InterfaceName
): void {
    if (!isInterfaceMethodImport(binding.specifier)) {
        return;
    }

    const descriptor = createUnexpectedImportDescriptor(binding, configuredMochaInterface);
    const { importDeclaration, specifier } = binding;

    if (hasOnlyNamedImportSpecifiers(importDeclaration) && isCanonicalNamedImportSpecifier(specifier)) {
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

function reportUnexpectedImportBindingsInModule(
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
