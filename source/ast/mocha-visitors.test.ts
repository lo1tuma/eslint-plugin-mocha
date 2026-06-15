import { type Rule, RuleTester } from 'eslint';
import { createMochaVisitors } from './mocha-visitors.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
type ProgramNode = Readonly<Parameters<Exclude<Rule.RuleListener['Program'], undefined>>[0]>;

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

const configDispatchRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            config(visitorContext) {
                if (visitorContext.config === 'timeout') {
                    ruleContext.report({
                        node: visitorContext.node,
                        message: `timeout:${visitorContext.name}`
                    });
                }
            }
        });
    }
};

ruleTester.run('mocha-visitors config dispatch', configDispatchRule, {
    valid: [
        'it("name", function () {});',
        'beforeEach(function () { this.timeout(1000); });'
    ],
    invalid: [
        {
            code: 'it("name", function () {}).timeout(1000);',
            errors: [ { message: 'timeout:it().timeout()' } ]
        }
    ]
});

const isolatedConfigDispatchRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            config(visitorContext) {
                if (visitorContext.config === 'timeout') {
                    ruleContext.report({
                        node: visitorContext.node,
                        message: `config:${visitorContext.name}`
                    });
                }
            },
            anyTestEntity(visitorContext) {
                if (visitorContext.config === 'timeout') {
                    ruleContext.report({
                        node: visitorContext.node,
                        message: `entity:${visitorContext.name}`
                    });
                }
            }
        });
    }
};

ruleTester.run('mocha-visitors isolates config dispatch', isolatedConfigDispatchRule, {
    valid: [
        'it("name", function () {});'
    ],
    invalid: [
        {
            code: 'it("name", function () {}).timeout(1000);',
            errors: [ { message: 'config:it().timeout()' } ]
        }
    ]
});

const hookDispatchRule: Readonly<Rule.RuleModule> = {
    meta: {
        schema: []
    },
    create(ruleContext) {
        return createMochaVisitors(ruleContext, {
            hook(visitorContext) {
                ruleContext.report({
                    node: visitorContext.node,
                    message: `hook:${visitorContext.type}`
                });
            },
            suiteOrTestCase(visitorContext) {
                ruleContext.report({
                    node: visitorContext.node,
                    message: `suiteOrTestCase:${visitorContext.type}`
                });
            }
        });
    }
};

ruleTester.run('mocha-visitors keeps hooks out of suite-or-test-case dispatch', hookDispatchRule, {
    valid: [
        'notMocha();'
    ],
    invalid: [
        {
            code: 'beforeEach(function () {});',
            errors: [ { message: 'hook:hook' } ]
        }
    ]
});
