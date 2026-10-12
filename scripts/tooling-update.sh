#!/usr/bin/env bash
# Bundle the Herdr API schema from a herdrdev/herdr release and regenerate
# the wire types. Needs gh for the GitHub API reads.
# `scripts/tooling-drift.sh update herdrdev/herdr <tag>` runs it, then
# records the tag in tooling.yml.
#
#   scripts/tooling-update.sh <tag>
set -euo pipefail

cd "$(dirname "$0")/.."

tag=${1:?usage: scripts/tooling-update.sh <tag>}
repo="herdrdev/herdr"
schema_path="docs/next/api/herdr-api.schema.json"

directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT

commit=$(gh api "repos/$repo/commits/$tag" --jq .sha)
gh api -H 'Accept: application/vnd.github.raw+json' \
  "repos/$repo/contents/$schema_path?ref=$tag" > "$directory/herdr-api.schema.json"

node scripts/update-herdr-schema.mjs --schema "$directory/herdr-api.schema.json" --commit "$commit"
bun run generate
