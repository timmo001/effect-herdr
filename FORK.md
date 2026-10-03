# Maintained fork

`timmo001/effect-herdr` started as a fork of [dmmulroy/herdr-ts-sdk](https://github.com/dmmulroy/herdr-ts-sdk) and is now maintained here as `@timmo001/effect-herdr`. The fork carries its own Effect 4 migration and tooling, and upstream may no longer be active.

- `main` is the default branch. Publishing a GitHub release publishes it to npm and JSR. Git consumers should pin a full commit from this branch.
- The daily **Sync upstream** workflow merges upstream `main` into the `sync/upstream` branch and opens a pull request against this fork's `main`. It never pushes to `main` directly. Conflicts fail the run and need merging by hand. Syncing is best-effort: upstream changes may need adapting to this fork's tooling before they merge. Merge sync pull requests with a merge commit, not a squash, so upstream history stays an ancestor of `main`.
- Renovate maintains dependencies with the shared `timmo001/renovate-config` preset.
