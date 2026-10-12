#!/usr/bin/env bash
# Bundle the Herdr API schema from a herdrdev/herdr release, regenerate the
# wire types and record that release as reviewed in tooling.yml. Needs gh
# for the GitHub API reads.
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

sed -i.bak "s|^\( *reviewed: *\).*\$|\1$tag|" tooling.yml
rm tooling.yml.bak

echo "Reviewed $repo at $tag ($commit)"
