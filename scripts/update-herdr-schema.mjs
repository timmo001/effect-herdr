import { Effect, FileSystem, Predicate, Schema } from "effect";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

/**
 * Bundle a Herdr API schema fetched from a Herdr release: write it to
 * `src/schema/herdr-api.schema.json` in the repository's Prettier style and
 * record its protocol and source commit under `herdr` in `package.json`.
 * `mise run tooling:update <tag>` fetches the schema and runs this, then
 * regenerates the wire types.
 */
const SchemaUpdateError = Schema.TaggedStruct("SchemaUpdateError", { message: Schema.String });

const parseSchemaDocument = Schema.decodeEffect(
  Schema.fromJsonString(
    Schema.Struct({
      protocol: Schema.Int,
      schema_version: Schema.Int,
      schemas: Schema.Record(Schema.String, Schema.MutableJson),
    }),
  ),
);

const parseManifest = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.MutableJson)),
);

const usage = "Usage: node scripts/update-herdr-schema.mjs --schema <file> --commit <sha>";

/**
 * @param {readonly string[]} args
 * @returns {{ readonly schema: string; readonly commit: string } | undefined}
 */
const parseArguments = (args) => {
  let schema;
  let commit;

  for (let index = 0; index < args.length; index += 2) {
    const value = args[index + 1];

    if (value === undefined) return undefined;

    switch (args[index]) {
      case "--schema":
        schema = value;
        break;
      case "--commit":
        commit = value;
        break;
      default:
        return undefined;
    }
  }

  return schema === undefined || commit === undefined || !/^[0-9a-f]{40}$/.test(commit)
    ? undefined
    : { schema, commit };
};

/** Format text the way `mise run format` formats that file. */
const formatFile = Effect.fn("HerdrSchema.format")(
  /** @param {string} filepath @param {string} text */
  function* (filepath, text) {
    return yield* Effect.tryPromise({
      try: async () => format(text, { ...(await resolveConfig(filepath)), filepath }),
      catch: (cause) =>
        SchemaUpdateError.make({ message: `Could not format ${filepath}: ${String(cause)}` }),
    });
  },
);

const updateSchema = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const options = parseArguments(process.argv.slice(2));

  if (options === undefined) {
    process.exitCode = 2;

    return yield* Effect.fail(SchemaUpdateError.make({ message: usage }));
  }

  const schemaPath = fileURLToPath(new URL("../src/schema/herdr-api.schema.json", import.meta.url));
  const manifestPath = fileURLToPath(new URL("../package.json", import.meta.url));

  const source = yield* fs.readFileString(options.schema);
  const document = yield* parseSchemaDocument(source);
  yield* fs.writeFileString(schemaPath, yield* formatFile(schemaPath, source));

  const manifest = yield* parseManifest(yield* fs.readFileString(manifestPath));
  const previous = manifest.herdr;

  /** @type {Record<string, import("effect").Schema.MutableJson>} */
  const herdr =
    Predicate.isObjectKeyword(previous) && !Array.isArray(previous) ? { ...previous } : {};

  herdr.protocol = document.protocol;
  herdr.upstreamCommit = options.commit;

  yield* fs.writeFileString(
    manifestPath,
    yield* formatFile(manifestPath, `${JSON.stringify({ ...manifest, herdr }, null, 2)}\n`),
  );

  yield* Effect.log(`Bundled Herdr schema at protocol ${document.protocol} from ${options.commit}`);
});

NodeRuntime.runMain(
  updateSchema.pipe(
    Effect.timeout("1 minute"),
    Effect.provide(NodeFileSystem.layer),
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error(
          Predicate.isTagged(error, "SchemaUpdateError")
            ? error.message
            : `Schema update failed (${error._tag})`,
        );
        process.exitCode ||= 1;
      }),
    ),
  ),
);
