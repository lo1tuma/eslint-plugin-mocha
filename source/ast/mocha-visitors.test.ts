import { type Rule, RuleTester } from 'eslint';
import { createMochaVisitors } from './mocha-visitors.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
type ProgramNode = Parameters<Exclude<Rule.RuleListener['Program'], undefined>>[0];

function readProgramBody(node: ProgramNode): Readonly<ProgramNode['body']> {
    return node.body;
}

const programOnlyRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            Program(node) {
                readProgramBody(node);
            }
        });
    }
};

ruleTester.run('mocha-visitors', programOnlyRule, {
    valid: [
        'beforeEach(function () {});',
        'const answer = 42;'
    ],
    invalid: []
});
