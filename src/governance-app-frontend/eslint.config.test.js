// @vitest-environment node
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import { localRules } from './eslint.config.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('route-loader-stale-time', localRules['route-loader-stale-time'], {
  valid: [
    "createFileRoute('/a')({ component: A });",
    "createFileRoute('/a')({ loader: load, staleTime: Infinity });",
    "createFileRoute('/a')({ loader: load, 'staleTime': 1000 });",
    "createFileRoute('/a')({ loader: load, ...shared });",
    "createFileRoute('/a')(options);",
    'createRoute({ loader: load });',
  ],
  invalid: [
    {
      code: "createFileRoute('/a')({ loader: load });",
      errors: [{ messageId: 'missingStaleTime' }],
    },
    {
      code: "createFileRoute('/a')({ loader() {}, component: A });",
      errors: [{ messageId: 'missingStaleTime' }],
    },
    {
      code: "createFileRoute('/a')({ loaderDeps: deps, 'loader': load });",
      errors: [{ messageId: 'missingStaleTime' }],
    },
  ],
});

const notOneKey = (code) => ({ code, errors: [{ messageId: 'notOneKey' }] });

ruleTester.run('i18n-single-key', localRules['i18n-single-key'], {
  valid: [
    't(($) => $.common.loading);',
    't(($) => $.common.count, { count });',
    'i18n.t(($) => $.common.loading);',
    '<Trans i18nKey={($) => $.common.loading} />;',
    't(($) => $.accounts[labelKey]);',
    't(($) => $.items[key].label);',
    't(($) => $.items[kinds[item.kind]]);',
    't(($) => (isOpen ? $.common.hide : $.common.show));',
    't(($) => (a ? $.common.one : b ? $.common.two : $.common.three));',
    't(($) => $.common.loading as never);',
    't(($) => $.common.loading!);',
    't(($) => ($ as Keys).common.loading);',
    't(($) => (isOpen ? $.common.hide : $.common.show) as never);',
    't(($) => (isOpen ? $.common.hide : ($.common.show as never)));',
    'items.map((item) => item.label);',
  ],
  invalid: [
    notOneKey('t(($) => ({ a: $.x.a, b: $.x.b })[key]);'),
    notOneKey('t(($) => [$.x.a, $.x.b][index]);'),
    notOneKey('t(($) => $.x.a || $.x.b);'),
    notOneKey('t(($) => isOpen && $.x.a);'),
    notOneKey('t(($) => $.x[$.y]);'),
    notOneKey('t(($) => ($.x ? $.y : $.z));'),
    notOneKey('t(($) => (isOpen ? $.x : "fallback"));'),
    notOneKey('t(($) => { return $.x.a; });'),
    notOneKey('t(($) => $);'),
    notOneKey('t(($) => $ as never);'),
    notOneKey('t(($) => $!);'),
    notOneKey('t(($) => (isOpen ? $ : $.x) as never);'),
    notOneKey('<Trans i18nKey={($) => ({ a: $.x.a, b: $.x.b })[key]} />;'),
  ],
});
