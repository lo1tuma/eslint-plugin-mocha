import type { Rule, SourceCode } from 'eslint';
import assert from 'node:assert';
import { hasAdjacentLeadingComment } from './no-pending-tests.js';

function asRuleNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

describe('no-pending-tests leading comment helpers', function () {
    it('hasAdjacentLeadingComment() returns true for an adjacent leading comment', function () {
        const comment = {
            type: 'Line',
            loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 19 }
            }
        };

        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [comment];
                },
                getTokenBefore() {
                    return null;
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 2, column: 0 },
                    end: { line: 2, column: 10 }
                }
            })
        );

        assert.strictEqual(result, true);
    });

    it('hasAdjacentLeadingComment() returns true when the previous token is on an earlier line', function () {
        const comment = {
            type: 'Line',
            loc: {
                start: { line: 2, column: 0 },
                end: { line: 2, column: 19 }
            }
        };

        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [comment];
                },
                getTokenBefore() {
                    return {
                        type: 'Identifier',
                        loc: {
                            start: { line: 1, column: 0 },
                            end: { line: 1, column: 9 }
                        }
                    };
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 3, column: 0 },
                    end: { line: 3, column: 10 }
                }
            })
        );

        assert.strictEqual(result, true);
    });

    it('hasAdjacentLeadingComment() returns false when there is no leading comment', function () {
        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [];
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 2, column: 0 },
                    end: { line: 2, column: 10 }
                }
            })
        );

        assert.strictEqual(result, false);
    });

    it('hasAdjacentLeadingComment() returns false when the comment is missing location data', function () {
        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [{ type: 'Line', loc: undefined }];
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 2, column: 0 },
                    end: { line: 2, column: 10 }
                }
            })
        );

        assert.strictEqual(result, false);
    });

    it('hasAdjacentLeadingComment() returns false when the node is missing location data', function () {
        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [{
                        type: 'Line',
                        loc: {
                            start: { line: 1, column: 0 },
                            end: { line: 1, column: 19 }
                        }
                    }];
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: undefined
            })
        );

        assert.strictEqual(result, false);
    });

    it('hasAdjacentLeadingComment() returns false for a trailing comment on another statement', function () {
        const comment = {
            type: 'Line',
            loc: {
                start: { line: 1, column: 13 },
                end: { line: 1, column: 32 }
            }
        };

        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [comment];
                },
                getTokenBefore() {
                    return {
                        type: 'Punctuator',
                        loc: {
                            start: { line: 1, column: 11 },
                            end: { line: 1, column: 12 }
                        }
                    };
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 2, column: 0 },
                    end: { line: 2, column: 10 }
                }
            })
        );

        assert.strictEqual(result, false);
    });

    it('hasAdjacentLeadingComment() returns false when a previous token shares the comment line', function () {
        const comment = {
            type: 'Line',
            loc: {
                start: { line: 2, column: 13 },
                end: { line: 2, column: 32 }
            }
        };

        const result = hasAdjacentLeadingComment(
            asSourceCode({
                getCommentsBefore() {
                    return [comment];
                },
                getTokenBefore() {
                    return {
                        type: 'Punctuator',
                        loc: {
                            start: { line: 2, column: 11 },
                            end: { line: 2, column: 12 }
                        }
                    };
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                loc: {
                    start: { line: 3, column: 0 },
                    end: { line: 3, column: 10 }
                }
            })
        );

        assert.strictEqual(result, false);
    });
});
