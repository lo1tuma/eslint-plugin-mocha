import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import {
    consistentSpacingBetweenBlocksRule,
    containsNode,
    isFirstStatementInScope
} from './consistent-spacing-between-blocks.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'script' } });

type StatementWrapper = (statement: string) => string;

const nestedStatementWrappers: StatementWrapper[] = [
    (statement) => {
        return `{
    ${statement}
}`;
    },
    (statement) => {
        return `testCases.forEach((testCase) => {
    ${statement}
});`;
    },
    (statement) => {
        return `if (condition) {
    ${statement}
}`;
    },
    (statement) => {
        return `if (condition)
    ${statement}`;
    },
    (statement) => {
        return `if (condition) {
    helper();
} else {
    ${statement}
}`;
    },
    (statement) => {
        return `for (let index = 0; index < testCases.length; index += 1) {
    ${statement}
}`;
    },
    (statement) => {
        return `for (let index = 0; index < testCases.length; index += 1)
    ${statement}`;
    },
    (statement) => {
        return `for (const key in testCases) {
    ${statement}
}`;
    },
    (statement) => {
        return `for (const key in testCases)
    ${statement}`;
    },
    (statement) => {
        return `for (const testCase of testCases) {
    ${statement}
}`;
    },
    (statement) => {
        return `for (const testCase of testCases)
    ${statement}`;
    },
    (statement) => {
        return `while (condition) {
    ${statement}
}`;
    },
    (statement) => {
        return `while (condition)
    ${statement}`;
    },
    (statement) => {
        return `do {
    ${statement}
} while (condition);`;
    },
    (statement) => {
        return `do
    ${statement}
while (condition);`;
    },
    (statement) => {
        return `switch (kind) {
    case 'first':
        ${statement}
        break;
    default:
        break;
}`;
    },
    (statement) => {
        return `try {
    ${statement}
} catch (error) {
    handle(error);
} finally {
    cleanup();
}`;
    },
    (statement) => {
        return `function registerCase() {
    ${statement}
}`;
    },
    (statement) => {
        return `const registerCase = () => {
    ${statement}
};`;
    }
];

function indentLines(code: string): string[] {
    return code.split('\n').map((line) => {
        return `    ${line}`;
    });
}

function createValidNestedStatementCase(wrapper: StatementWrapper): { code: string; } {
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

function createInvalidNestedStatementCase(wrapper: StatementWrapper): {
    code: string;
    output: string;
    errors: [{ message: string; }];
} {
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

        {
            code: `describe('My Test', () => {
            it('does something', () => {});
        });`
        },

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
        {
            code: `describe('foo', () => {
                it('bar', () => {}).timeout(42);
            });`
        },
        {
            code: `describe('foo', () => {
                it('bar', () => {}).timeout(42);

                it('baz', () => {}).timeout(42);
            });`
        },
        {
            code: `describe('foo', () => {
                it('bar', () => {})
                    .timeout(42);

                it('baz', () => {})
                    .timeout(42);
            });`
        },
        {
            code: `describe('foo', () => {
                [
                    { title: 'bar' },
                    { title: 'baz' },
                ].forEach((testCase) => {
                    it(testCase.title, () => {});
                });
            });`
        },
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
                    message: 'Expected line break before this statement.'
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
                    message: 'Expected line break before this statement.'
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
                    message: 'Expected line break before this statement.'
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
                    message: 'Expected line break before this statement.'
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
                    message: 'Expected line break before this statement.'
                }
            ]
        },

        {
            code: 'describe("", () => {});describe("", () => {});',
            output: 'describe("", () => {});\n\ndescribe("", () => {});',
            errors: [
                {
                    message: 'Expected line break before this statement.'
                }
            ]
        },

        {
            code: 'describe();\ndescribe();',
            output: 'describe();\n\ndescribe();',
            errors: [
                {
                    message: 'Expected line break before this statement.'
                }
            ]
        },
        ...nestedStatementWrappers.map(createInvalidNestedStatementCase)
    ]
});

describe('consistent-spacing-between-blocks helpers', function () {
    it('containsNode() returns false when ranges are missing', function () {
        const result = containsNode({ range: undefined } as Rule.Node, { range: [0, 1] } as Rule.Node);

        assert.strictEqual(result, false);
    });

    it('isFirstStatementInScope() falls back to the scope node when the block is empty', function () {
        const scopeNode = {
            type: 'BlockStatement',
            body: [],
            range: [0, 10]
        } as unknown as Rule.Node;
        const node = {
            type: 'ExpressionStatement',
            range: [1, 2]
        } as unknown as Rule.Node;

        const result = isFirstStatementInScope(scopeNode as never, node);

        assert.strictEqual(result, true);
    });
});
