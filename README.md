# Proof of concept for self-contained ESLint binary

This project is meant as a proof of concept (or a showcase) of self-contained
ESLint binary. Instead of installing `eslint` npm package and executing it using
Node.js, this project produces a single `eslint` binary file that contains all
of the ESLint code and is able to load plugins like in a normal workflow.

This project was prompted by a discussion between ESLint and Deno maintainers;
besides being a fun experiment, there are several reason why it might be an
interesting feature for ESLint:

- Easy migration to native code for performance critical parts of the codebase -
  thanks to Deno's "ops" system it's easy to rewrite parts of the codebase that
  need to most performance in Rust. For such parts a minimal amount of glue code
  is needed to rewrite a JavaScript function in Rust. _TODO: link to a function
  that has been rewritten from JavaScript to Rust_

- Faster startup - _hasn't been achieved yet, currently on par with Node.js, but
  there's more work lined up here that should change this_ - thanks to V8
  snapshots we can parse the whole ESLint source code during the build step.
  This should lead to faster startup performance, because there's less work to
  be done on startup (only execution of code).

- Sandboxing - using Deno's permissions system we are able to sandbox ESLint
  binary to only have read and write access to the disk and read access to
  environmental variables. None of the ESLint's code, nor plugins code can
  connect to the internet, spawn subprocesses, use high resolution timing or
  load native extensions/dynamic libaries.

- Easier distribution - users would only download a single file (or an npm
  package that contains only a binary file). We are aiming at 20-30Mb binary
  file - _hasn't been achieved yet, currently this project uses full build of
  Deno which clocks at around 70Mb; this will be fixed in the future_.

## Roadmap

- [x] add a script to ESLint that produces bundle
- [x] change ESLint to not include lazy loading paths for bundle - everything
      should be included in the bundle already
- [x] produce a single binary target that only executes bundled ESLint that
      doesn't have all the Deno CLI flags
- [ ] rewrite one of the built-in ESLint functions to a Rust version using
      Deno's ops system
- [ ] rewrite ESLint CLI in Rust - that way we can execute ESLint's JS code only
      for actual linting, should provide further startup performance
      improvements
- [ ] multithreading - files can be linted independently on multiple threads
- [ ] update the project to use Deno crates instead of building full Deno
- [ ] integrate `typescript-eslint` into the binary
- [ ] maybe built-in LSP support?

## Development

Build instructions:

1. Make sure all git submodules are up to date:
   `git submodule update --init --recursive`
1. Run `deno run -A --unstable build.ts` (you can add `--release` flag to build
   release binary)

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
1. Some path modification was applied to load reporters - they are loaded
   eagerly in ESLint code and then are limited to built-in reporters
1. All the code is bundled to `bundle.js` (bundle is produced by `esbuild` in
   `build.ts` script)

Hopefully, these changes could be upstreamed to ESLint itself
