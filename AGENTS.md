# effect-herdr

Effect v4 SDK for Herdr's local socket API, published as `@timmo001/effect-herdr`. The README
documents usage and development; [FORK.md](FORK.md) covers the fork and upstream sync.

## Start here

- Read [architecture](docs/architecture.md) before changing behaviour.
- [src/schema/herdr-api.schema.json](src/schema/herdr-api.schema.json) owns the wire contract.
- Load [agent workflow](docs/agent-workflow.md) for the task-to-file/test map, learning routes,
  verification choices, and subagent task/handoff contract.
- [README](README.md) owns the public API guide; [parity ledger](docs/sdk-v1-parity.md) maps
  dispatch coverage. Neither replaces focused lifecycle/failure tests.

## Tooling

- Use mise-pinned tools and Bun. Keep `bun.lock` in sync with `package.json`.
- Use `mise run format`, `mise run check` and `mise run build` for validation.
- `mise run generate` rewrites `src/generated` from the bundled schema; `mise run generate:check`
  fails on drift. Generated wire types stay private.
- `src/index.ts` is the package entrypoint; `dist/` is generated and untracked.
- Use lowercase filenames, with kebab-case for multiword names.
- Use the shared `@timmo001/oxlint-rules/configs/recommended-effect` preset and
  its supported Oxlint peers.

## SDK conventions

Apply the parsing, type-evidence, Effect imports/workflows, typed errors, service/Layer, resource
ownership, testing, naming, and JSDoc rules in [coding standards](docs/coding-standards.md).
Preserve established public encoded inputs and SDK constructor exports; do not turn a focused
change into an API migration. Read [error guidance](docs/errors.md) when changing failures.

- Parse public inputs at service boundaries; keep generated snake-case types inside wire adapters.
- Keep narrow truthful Effect error/requirement channels and Scope-owned resource cleanup.
- Use idiomatic Effect for production code, harnesses, tests, and `.mjs` tooling: `Effect.gen`,
  scoped acquisition/finalization, and Effect concurrency primitives. Adapt unavoidable Node
  callbacks once at the edge; run Effects at CLI/Vitest boundaries. Keep pure calculations pure.
- Search existing owners before adding helpers; use domain-searchable names and attached JSDoc.
- Import installed packages, never agent reference source. [OpenCode references](opencode.json)
  are read-only upstream repositories; installed declarations and the bundled schema are
  authoritative when a branch reference targets a different revision.
- Tests use isolated local fixtures through public SDK/service interfaces, never ambient
  sessions, personal panes, or a developer's socket.
- Do not run live examples as verification. Consult [example safety notes](examples/README.md).

## Before handing off

Run focused tests with `./node_modules/.bin/vitest run <test-file>`, then `mise run check`.
`.tst.ts` contracts are checked by `bun run typecheck`, not Vitest. Report exact commands and
outcomes, remaining uncertainty, and any tooling friction in the handoff, not in tracked files.
