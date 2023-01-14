## Proof of concept for self-contained ESLint binary

Build instructions:

1. Make sure all git submodules are up to date:
   `git submodule update --init --recursive`
1. Run `deno run -A --unstable build.ts`

Try it:

```
$ env ESLINT_USE_FLAT_CONFIG=true ./deno/target/debug/eslint -c test/config.js test/foo.js
/Users/ib/dev/eslint_binary/test/foo.js
  1:5   error  'foo' is assigned a value but never used  no-unused-vars
  3:10  error  'emptyFn' is defined but never used       no-unused-vars
  4:5   error  Unexpected 'debugger' statement           no-debugger
  8:5   error  'console' is not defined                  no-undef
  8:5   error  Unreachable code                          no-unreachable

✖ 5 problems (5 errors, 0 warnings)
```

## How it works?

Since it's a PoC, there are several, quick and dirty hacks applied to make it
work, that can be fixed gradually.

The first and most important hack is that this project uses modified `deno`
project - it forces `deno` to run with Node.js compatibility enabled. In the
future, we'd use a custom Rust project that uses different Deno crates and
provides a bespoke binary that doesn't include all the Deno tooling and is much
slimmer.

Secondly, there are several modification to ESLint itself:

1. `lib/rules/index.js` was changed to use a regular `Map` instead of
   `LazyLoadingRuleMap` and all rules use `require()` directly, instead of
   `() => require(...)`
1. All the code is bundled to `bundle.js` (bundle is produced by `esbuild` in
   `build.ts` script)
1. Some path modification was applied to load reporters - they are loaded
   eagerly in ESLint code and then are limited to built-in reporters

Since there are several places where ESLint does lazy loading, this is not
really a "self-contained binary"; it still requires certain files to be present
in certain places, but these problems could probably be alleviated with small
changes to ESLint itself.

Future work:

- [x] add a script to ESLint that produces bundle
- [x] change ESLint to not include lazy loading paths for bundle - everything
      should be included in the bundle already
- [ ] update the project to use Deno crates instead of building full Deno
- [x] produce a single binary target that only executes bundled ESLint that
      doesn't have all the Deno CLI flags
