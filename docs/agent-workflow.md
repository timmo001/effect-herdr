# Agent workflow

Read [AGENTS.md](../AGENTS.md) first. This guide is loaded on demand, not a second API catalog.
Versions and available commands belong to [package.json](../package.json); operation coverage
belongs to the [parity ledger](sdk-v1-parity.md).

## Find the owner and its verification

Paths below are relative to this document. Start with the smallest row that matches the change,
then follow its imports and callers. Runtime tests exercise isolated local fixtures, not live Herdr.

| Task                                                 | Implementation / contract                                                                                                        | Focused verification                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Public entrypoint, root composition                  | [index](../src/index.ts), [SDK](../src/herdr-sdk.ts)                                                                             | [SDK runtime](../src/herdr-sdk.test.ts), [SDK inference](../src/herdr-sdk.tst.ts), [Layer requirements](../src/herdr-layers.tst.ts) |
| Config selection, deadlines, platform paths          | [config](../src/herdr-config.ts)                                                                                                 | [config tests](../src/herdr-config.test.ts)                                                                                         |
| Public input/domain invariants                       | [domain](../src/herdr-domain.ts), [models](../src/herdr-models.ts), [schema boundary](../src/herdr-schema-boundary.ts)           | [input boundaries](../src/herdr-input-boundaries.test.ts), [domain behavior](../src/herdr-domain.test.ts)                           |
| Wire parameters, opaque records, recursive inputs    | [encoder](../src/herdr-wire-encoder.ts), [schema](../src/schema/herdr-api.schema.json)                                           | [encoder runtime](../src/herdr-wire-encoder.test.ts), [encoder inference](../src/herdr-wire-encoder.tst.ts)                         |
| Correlation, framing, compatibility, cleanup         | [transport](../src/herdr-transport.ts), [socket lines](../src/herdr-socket-lines.ts), [wire parser](../src/herdr-wire-parser.ts) | [transport tests](../src/herdr-transport.test.ts)                                                                                   |
| Live event acceptance, narrowing, bootstrap          | [event service](../src/event-service.ts)                                                                                         | [event tests](../src/event-service.test.ts), [SDK inference](../src/herdr-sdk.tst.ts)                                               |
| Namespace dispatch / result variants                 | Service owner in [parity ledger](sdk-v1-parity.md)                                                                               | [dispatch tests](../src/herdr-full-parity.test.ts), plus the ledger's focused suite                                                 |
| Typed failures / safe diagnostics                    | [errors](../src/herdr-errors.ts), [error policy](errors.md)                                                                      | [error tests](../src/herdr-errors.test.ts), owning boundary suite                                                                   |
| Fixture synchronization / bounded metadata timelines | [test server](../src/herdr-test-server.ts), [wire fixtures](../src/herdr-wire-fixtures.ts)                                       | [fixture tests](../src/herdr-test-server.test.ts), plus consumers of the changed behavior                                           |
| Platform paths / repeated lifecycle schedules        | [config](../src/herdr-config.ts), [transport](../src/herdr-transport.ts)                                                         | [platform tests](../src/herdr-platform.test.ts), [stress tests](../src/herdr-stress.test.ts)                                        |
| Generation, packaging, executable docs               | [generator](../scripts/generate-wire-types.mjs), [package](../package.json), [examples](../examples/README.md)                   | `mise run generate:check`, `bun run typecheck`, `mise run build`                                                                    |

## Learning through executable behavior

Do not copy an Effect API cookbook into this repository. Trace one existing test through the
public service, its dependency-preserving Layer, and the local socket boundary. Run that test,
change one assertion or fixture input deliberately, observe the failure, and restore or turn the
experiment into a justified regression test. Keep temporary experiments out of tracked files.

The [learning tests](../src/herdr-learning.test.ts) own assertion-bearing recipes and hypothesis
comments. Run one with `./node_modules/.bin/vitest run src/herdr-learning.test.ts -t "<name>"`.

Other useful routes (commands run from the repository root):

- Composition: `./node_modules/.bin/vitest run src/herdr-sdk.test.ts`; inspect the adjacent
  `.tst.ts` files for requirements and inference, which runtime Vitest does not check.
- Boundary parsing to wire encoding: `./node_modules/.bin/vitest run src/herdr-input-boundaries.test.ts src/herdr-wire-encoder.test.ts`.
- Resource lifetimes: `./node_modules/.bin/vitest run src/event-service.test.ts src/herdr-transport.test.ts`.
- Exact upstream Effect behavior: find the installed version in the package manifest, then inspect
  the Effect [OpenCode reference](../opencode.json) and its agent guidance; never import or edit it.
  Branch references may be newer. Confirm exports/signatures against the installed package.

The [examples catalog](../examples/README.md) is for explicitly authorized application use.
Examples may send terminal input, launch agents, or change live state; they are not test fixtures.

## Verification commands

Run from the repository root with installed dependencies. Apart from `generate:check`, these checks
do not rewrite tracked files, and none contact live Herdr.

| Command                   | Evidence and limits                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `mise run check`          | Lint, typecheck, runtime tests and format check. `bun run check` runs the same stages.                  |
| `bun run lint`            | Shared Oxlint rules, including type-aware checks.                                                       |
| `bun run typecheck`       | Source plus `.tst.ts` inference contracts, tooling and examples. Vitest does not check these.           |
| `bun run test`            | Runtime Vitest suites, including platform and stress coverage.                                          |
| `mise run generate:check` | Regenerates `src/generated` and fails on drift. It rewrites the files first, so run it on a clean tree. |
| `mise run build`          | Emits ESM and declarations into `dist/`.                                                                |

A platform pass on one OS does not prove other operating systems. Seeded reproduction controls live
in the [stress tests](../src/herdr-stress.test.ts), not a second defaults inventory.

## Verification discipline

1. Inspect `git status --short` and establish file ownership before editing a shared checkout.
2. Run the relevant runtime file with `./node_modules/.bin/vitest run <test-file>`.
3. Check compile-time `.tst.ts` contracts with the repository typecheck, not Vitest alone.
4. Select broader commands from [package.json](../package.json) after inspecting what they run.
   `check` is the non-mutating full route. `generate`, `format` and `oxlint --fix` write files.
   Do not use writing commands as verification in a shared checkout.
5. Inspect the scoped diff and report evidence separately from untested confidence. A dispatch
   pass is not proof of teardown, interruption, resource bounds, platform support, or packaging.

Use explicit local socket paths and bounded fixture waits. Synchronize tests on observed requests,
acceptance, writes, or close events rather than sleep-based timing guesses. Failure diagnostics
must be bounded metadata, never request/response bodies, terminal text, environment values, or
absolute paths. Do not add production logging just to debug a fixture.

## Subagent task contract

Send a small task that contains all of the following (inline in the agent prompt):

- **Goal and acceptance:** caller-observable behavior, smallest proving test, and non-goals.
- **Base and checkout:** comparison commit, shared checkout or isolated worktree, current branch.
- **Ownership:** exact writable paths; everything else is read-only unless reassigned.
- **Interfaces:** existing public seam to use, needed peer API and its owner, integration order.
- **Safety:** fixture-only tests, references read-only, no live control, installs, commits, broad fixes,
  generated rewrites, or tracked execution artifacts unless explicitly authorized.
- **Verification:** focused command first, broader checks owned by the coordinator if concurrent.
- **Delivery:** changes in the assigned checkout and the concise handoff below, not a report file.

Raise API needs and ownership conflicts before editing another agent's files. Address a peer only
by a confirmed name/target; otherwise ask the coordinator. Do not infer an agent identity from a
role. Peer edits are concurrent work, not changes to revert. The coordinator owns integration,
shared command definitions, cross-agent compatibility, and final verification.

## Subagent handoff contract

Return these facts in the terminal, keeping evidence reproducible:

- **Changed:** exact paths and behavior; any interface needed by peers.
- **Verified:** exact commands, outcome, and scope (runtime, type, package, platform, stress).
- **Uncertain/blocked:** failures with concrete evidence, tests not run, platform assumptions,
  remaining integration work, and whether a failure was observed before the change.
- **Friction:** one or two concrete navigation/tooling problems and the smallest useful fix;
  say none if there were none. Do not propose a framework or create a new inventory by default.

A passing focused suite is a scoped claim, not permission to label the whole initiative complete.
