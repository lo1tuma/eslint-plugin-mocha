import { RuleTester } from 'eslint';
import { consistentSpacingBetweenBlocksRule } from './consistent-spacing-between-blocks.ts';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'script' } });

type StatementWrapper = (statement: string) => string;

const nestedStatementWrappers: StatementWrapper[] = [
    function (statement) {
        return `{
    ${statement}
}`;
    },
    function (statement) {
        return `testCases.forEach((testCase) => {
    ${statement}
});`;
    },
    function (statement) {
        return `if (condition) {
    ${statement}
}`;
    },
    function (statement) {
        return `if (condition)
    ${statement}`;
    },
    function (statement) {
        return `if (condition) {
    helper();
} else {
    ${statement}
}`;
    },
    function (statement) {
        return `for (let index = 0; index < testCases.length; index += 1) {
    ${statement}
}`;
    },
    function (statement) {
        return `for (let index = 0; index < testCases.length; index += 1)
    ${statement}`;
    },
    function (statement) {
        return `for (const key in testCases) {
    ${statement}
}`;
    },
    function (statement) {
        return `for (const key in testCases)
    ${statement}`;
    },
    function (statement) {
        return `for (const testCase of testCases) {
    ${statement}
}`;
    },
    function (statement) {
        return `for (const testCase of testCases)
    ${statement}`;
    },
    function (statement) {
        return `while (condition) {
    ${statement}
}`;
    },
    function (statement) {
        return `while (condition)
    ${statement}`;
    },
    function (statement) {
        return `do {
    ${statement}
} while (condition);`;
    },
    function (statement) {
        return `do
    ${statement}
while (condition);`;
    },
    function (statement) {
        return `switch (kind) {
    case 'first':
        ${statement}
        break;
    default:
        break;
}`;
    },
    function (statement) {
        return `try {
    ${statement}
} catch (error) {
    handle(error);
} finally {
    cleanup();
}`;
    },
    function (statement) {
        return `function registerCase() {
    ${statement}
}`;
    },
    function (statement) {
        return `const registerCase = () => {
    ${statement}
};`;
    }
];

function indentLines(code: string): string[] {
    return code.split('\n').map(function (line) {
        return `    ${line}`;
    });
}

type ValidNestedStatementCase = {
    readonly code: string;
};
type InvalidNestedStatementCase = {
    readonly code: string;
    readonly output: string;
    readonly errors: readonly { readonly message: string; }[];
};

function createValidNestedStatementCase(wrapper: StatementWrapper): ValidNestedStatementCase {
    return {
        code: [
            "describe('foo', () => {",
            "    it('bar', () => {});",
            '',
            ...indentLines(wrapper("it('baz', () => {});")),
            '});'
        ]
            .join('\n')
    };
}

function createInvalidNestedStatementCase(wrapper: StatementWrapper): InvalidNestedStatementCase {
    return {
        code: [
            "describe('foo', () => {",
            "    it('bar', () => {});",
            '',
            ...indentLines(wrapper('helper();')),
            '    afterEach(() => {});',
            '});'
        ]
            .join('\n'),
        output: [
            "describe('foo', () => {",
            "    it('bar', () => {});",
            '',
            ...indentLines(wrapper('helper();')),
            '',
            '    afterEach(() => {});',
            '});'
        ]
            .join('\n'),
        errors: [
            {
                message: 'Expected line break before this statement.'
            }
        ]
    };
}

ruleTester.run('consistent-spacing-between-mocha-calls', consistentSpacingBetweenBlocksRule, {
    valid: [
        `describe();

        describe();`,

        `describe('My Test', () => {
            it('does something', () => {});
        });`,

        // Proper line break before each block within describe
        `describe('My Test', () => {
            it('performs action one', () => {});

            it('performs action two', () => {});
        });`,

        // Nested describe blocks with proper spacing
        `describe('Outer block', () => {
            describe('Inner block', () => {
                it('performs an action', () => {});
            });

            afterEach(() => {});
        });`,

        // Describe block with comments
        `describe('My Test With Comments', () => {
            it('does something', () => {});

            // Some comment
            afterEach(() => {});
        });`,

        `it('does something outside a describe block', () => {});

        afterEach(() => {});`,
        `describe('foo', () => {
                it('bar', () => {}).timeout(42);
            });`,
        `describe('foo', () => {
                it('bar', () => {}).timeout(42);

                it('baz', () => {}).timeout(42);
            });`,
        `describe('foo', () => {
                it('bar', () => {})
                    .timeout(42);

                it('baz', () => {})
                    .timeout(42);
            });`,
        `describe('foo', () => {
                [
                    { title: 'bar' },
                    { title: 'baz' },
                ].forEach((testCase) => {
                    it(testCase.title, () => {});
                });
            });`,
        "describe('foo', () => it('bar', () => {}));",
        ...nestedStatementWrappers.map(createValidNestedStatementCase)
    ],

    invalid: [
        // Missing line break between it and afterEach
        {
            code: `describe('My Test', function () {
                it('does something', () => {});
                afterEach(() => {});
            });`,
            output: `describe('My Test', function () {
                it('does something', () => {});

                afterEach(() => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 3,
                    column: 17,
                    endLine: 3,
                    endColumn: 36
                }
            ]
        },

        // Missing line break between beforeEach and it
        {
            code: `describe('My Test', () => {
                beforeEach(() => {});
                it('does something', () => {});
            });`,
            output: `describe('My Test', () => {
                beforeEach(() => {});

                it('does something', () => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 3,
                    column: 17,
                    endLine: 3,
                    endColumn: 47
                }
            ]
        },

        // Missing line break after a variable declaration
        {
            code: `describe('Variable declaration', () => {
                const a = 1;
                it('uses a variable', () => {});
            });`,
            output: `describe('Variable declaration', () => {
                const a = 1;

                it('uses a variable', () => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 3,
                    column: 17,
                    endLine: 3,
                    endColumn: 48
                }
            ]
        },

        // Blocks on the same line
        {
            code: "describe('Same line blocks', () => {" +
                "it('block one', () => {});" +
                "it('block two', () => {});" +
                '});',
            output: "describe('Same line blocks', () => {" +
                "it('block one', () => {});" +
                '\n\n' +
                "it('block two', () => {});" +
                '});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 1,
                    column: 63,
                    endLine: 1,
                    endColumn: 88
                }
            ]
        },
        {
            code: "describe('Same line blocks', () => {" +
                "it('block one', () => {})\n.timeout(42);" +
                "it('block two', () => {});" +
                '});',
            output: "describe('Same line blocks', () => {" +
                "it('block one', () => {})\n.timeout(42);" +
                '\n\n' +
                "it('block two', () => {});" +
                '});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 2,
                    column: 14,
                    endLine: 2,
                    endColumn: 39
                }
            ]
        },

        {
            code: 'describe("", () => {});describe("", () => {});',
            output: 'describe("", () => {});\n\ndescribe("", () => {});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 1,
                    column: 24,
                    endLine: 1,
                    endColumn: 46
                }
            ]
        },

        {
            code: 'describe();\ndescribe();',
            output: 'describe();\n\ndescribe();',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    line: 2,
                    column: 1,
                    endLine: 2,
                    endColumn: 11
                }
            ]
        },
        ...nestedStatementWrappers.map(function (wrapper) {
            const testCase = createInvalidNestedStatementCase(wrapper);

            return {
                ...testCase,
                errors: Array.from(testCase.errors)
            };
        })
    ]
});
