import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime";
import { Config, Effect, FileSystem, Option, Predicate, Redacted, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

// Bundle the Herdr API schema from a herdrdev/herdr release: fetch the schema
// at the tag, write it to `src/schema/herdr-api.schema.json` in the
// repository's Prettier style, and record its protocol and the tag's commit
// under `herdr` in `package.json`. `mise run tooling:refresh <tag>` runs this,
// then regenerates the wire types.

const repository = "herdrdev/herdr";

const schemaPath = "docs/next/api/herdr-api.schema.json";

class SchemaUpdateError extends Schema.TaggedError<SchemaUpdateError>()("SchemaUpdateError", {
  message: Schema.String,
}) {}

const SchemaDocument = Schema.Struct({
  protocol: Schema.Int,
  schema_version: Schema.Int,
  schemas: Schema.Record(Schema.String, Schema.MutableJson),
});

const parseSchemaDocument = Schema.decodeEffect(Schema.fromJsonString(SchemaDocument));

const Manifest = Schema.Record(Schema.String, Schema.MutableJson);

const parseManifest = Schema.decodeEffect(Schema.fromJsonString(Manifest));

const Commit = Schema.Struct({ sha: Schema.String });

const parseCommit = Schema.decodeEffect(Schema.fromJsonString(Commit));

const usage = "Usage: bun scripts/update-herdr-schema.mts --tag <tag>";

const parseArguments = (args: readonly string[]): { readonly tag: string } | undefined =>
  args.length === 2 && args[0] === "--tag" && args[1] !== undefined && args[1] !== ""
    ? { tag: args[1] }
    : undefined;

/** Format text the way `mise run format` formats that file. */
const formatFile = Effect.fn("HerdrSchema.format")(function* (filepath: string, text: string) {
  return yield* Effect.tryPromise({
    try: async () => format(text, { ...(await resolveConfig(filepath)), filepath }),
    catch: (cause) =>
      new SchemaUpdateError({ message: `Could not format ${filepath}: ${String(cause)}` }),
  });
});

/** GitHub reads, authenticated when GH_TOKEN or GITHUB_TOKEN is set. */
const github = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;

  const ghToken = yield* Config.option(Config.Redacted("GH_TOKEN"));
  const githubToken = yield* Config.option(Config.Redacted("GITHUB_TOKEN"));
  const token = Option.orElse(ghToken, () => githubToken);

  return client.pipe(
    HttpClient.filterStatusOk,
    HttpClient.mapRequest((request) =>
      Option.isSome(token)
        ? HttpClientRequest.bearerToken(request, Redacted.value(token.value))
        : request,
    ),
  );
});

const updateSchema = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const options = parseArguments(process.argv.slice(2));

  if (options === undefined) {
    process.exitCode = 2;

    return yield* new SchemaUpdateError({ message: usage });
  }

  const client = yield* github;

  const commit = yield* client
    .get(`https://api.github.com/repos/${repository}/commits/${options.tag}`)
    .pipe(
      Effect.flatMap((response) => response.text),
      Effect.flatMap(parseCommit),
    );

  const source = yield* client
    .get(`https://raw.githubusercontent.com/${repository}/${options.tag}/${schemaPath}`)
    .pipe(Effect.flatMap((response) => response.text));

  const document = yield* parseSchemaDocument(source);

  const bundledPath = fileURLToPath(
    new URL("../src/schema/herdr-api.schema.json", import.meta.url),
  );

  const manifestPath = fileURLToPath(new URL("../package.json", import.meta.url));

  yield* fs.writeFileString(bundledPath, yield* formatFile(bundledPath, source));

  const manifest = yield* parseManifest(yield* fs.readFileString(manifestPath));
  const previous = manifest.herdr;

  const herdr: Record<string, Schema.MutableJson> =
    Predicate.isObjectKeyword(previous) && !Array.isArray(previous) ? { ...previous } : {};

  herdr.protocol = document.protocol;
  herdr.upstreamCommit = commit.sha;

  yield* fs.writeFileString(
    manifestPath,
    yield* formatFile(manifestPath, `${JSON.stringify({ ...manifest, herdr }, null, 2)}\n`),
  );

  yield* Effect.log(
    `Bundled the Herdr schema at protocol ${document.protocol} from ${options.tag} (${commit.sha})`,
  );
});

NodeRuntime.runMain(
  updateSchema.pipe(
    Effect.timeout("2 minutes"),
    Effect.provide([NodeFileSystem.layer, FetchHttpClient.layer]),
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error(
          Predicate.isTagged(error, "SchemaUpdateError")
            ? error.message
            : `Schema update failed (${error._tag}): ${String(error)}`,
        );
        process.exitCode ||= 1;
      }),
    ),
  ),
);
