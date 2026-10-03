/**
 * Controls Herdr server lifecycle and compatibility operations.
 *
 * The server service exposes ping, stop, live handoff, configuration reload, agent-manifest cache inspection, and scope-owned SSH agent registration through the shared transport.
 *
 * @since 0.8.2
 */
import { Context, Effect, Layer, Option, Schema, Scope, Stream } from "effect";
import {
  AgentManifest,
  AgentManifestStatus,
  ConfigReloadResult,
  PingResult,
  ServerLiveHandoffInput,
  type ServerLiveHandoffInputEncoded,
  ServerSshAgentRegisterInput,
  type ServerSshAgentRegisterInputEncoded,
} from "./herdr-models.ts";
import type { HerdrTransportError } from "./herdr-errors.ts";
import { decodeHerdrInput, decodeHerdrWire } from "./herdr-schema-boundary.ts";
import { defineHerdrOperation } from "./herdr-effect-operation.ts";
import {
  HerdrTransport,
  herdrTransportLayer,
  type HerdrTransportRequestError,
  type HerdrTransportRequestOptionsEncoded,
} from "./herdr-transport.ts";

const parseAgentManifests = Schema.decodeUnknownEffect(Schema.Array(AgentManifest));

const parseAgentManifestStatus = Schema.decodeUnknownEffect(AgentManifestStatus);

const parseConfigReloadResult = Schema.decodeUnknownEffect(ConfigReloadResult);

const parsePingResult = Schema.decodeUnknownEffect(PingResult);

const parseServerLiveHandoffInput = Schema.decodeEffect(ServerLiveHandoffInput);

const parseServerSshAgentRegisterInput = Schema.decodeEffect(ServerSshAgentRegisterInput);

/**
 * Expected failure union for server lifecycle and compatibility operations.
 *
 * @category errors
 * @since 0.8.2
 */
export type ServerOperationError = HerdrTransportRequestError;

/**
 * Active SSH agent registration held by an open API connection.
 *
 * @category models
 * @since 0.9.2
 */
export interface ServerSshAgentLease {
  /** Wire request identifier of the accepted registration. */
  readonly requestId: string;
  /** Completes when the server closes the connection, ending the registration early. */
  readonly closed: Effect.Effect<void, HerdrTransportError>;
}

/**
 * Server lifecycle, compatibility, configuration, and manifest capability.
 *
 * @category services
 * @since 0.8.2
 */
export interface IServerService {
  /** Pings the server and verifies protocol compatibility. */
  readonly ping: (
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<PingResult, ServerOperationError>;
  /** Requests a graceful Herdr server stop. */
  readonly stop: (
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<void, ServerOperationError>;
  /** Hands the running server to a compatible executable. */
  readonly liveHandoff: (
    input?: ServerLiveHandoffInputEncoded,
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<void, ServerOperationError>;
  /** Reloads the running server's configuration. */
  readonly reloadConfig: (
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<ConfigReloadResult, ServerOperationError>;
  /** Reads the current agent-manifest cache status. */
  readonly getAgentManifests: (
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<AgentManifestStatus, ServerOperationError>;
  /** Refreshes agent manifests and returns the resulting set. */
  readonly reloadAgentManifests: (
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<readonly AgentManifest[], ServerOperationError>;
  /** Registers a remote-host SSH agent socket until the current scope closes; Unix servers only. */
  readonly registerSshAgent: (
    input: ServerSshAgentRegisterInputEncoded,
    options?: HerdrTransportRequestOptionsEncoded,
  ) => Effect.Effect<ServerSshAgentLease, ServerOperationError, Scope.Scope>;
}

/**
 * Yieldable Effect service for Herdr server operations.
 *
 * @category services
 * @since 0.8.2
 */
export class ServerService extends Context.Service<ServerService, IServerService>()(
  "@herdr/sdk/ServerService",
) {}

/**
 * Constructs server operations while preserving the shared transport requirement.
 *
 * @category constructors
 * @since 0.8.2
 */
export const makeServerService = Effect.gen(function* () {
  const transport = yield* HerdrTransport;

  return ServerService.of({
    ping: defineHerdrOperation("ServerService.ping", (options = {}) =>
      Effect.gen(function* () {
        const response = yield* transport.request("ping", {}, options);

        return yield* decodeHerdrWire(parsePingResult, response.result, response.requestId);
      }),
    ),
    stop: defineHerdrOperation("ServerService.stop", (options = {}) =>
      transport.request("server.stop", {}, options).pipe(Effect.asVoid),
    ),
    liveHandoff: defineHerdrOperation("ServerService.liveHandoff", (input = {}, options = {}) =>
      Effect.gen(function* () {
        const parsed = yield* decodeHerdrInput(
          "ServerService.liveHandoff",
          parseServerLiveHandoffInput,
          input,
        );

        yield* transport.request(
          "server.live_handoff",
          {
            importExe: Option.getOrNull(parsed.importExe),
            expectedProtocol: Option.getOrNull(parsed.expectedProtocol),
            expectedVersion: Option.getOrNull(parsed.expectedVersion),
          },
          options,
        );
      }),
    ),
    reloadConfig: defineHerdrOperation("ServerService.reloadConfig", (options = {}) =>
      Effect.gen(function* () {
        const response = yield* transport.request("server.reload_config", {}, options);

        return yield* decodeHerdrWire(parseConfigReloadResult, response.result, response.requestId);
      }),
    ),
    getAgentManifests: defineHerdrOperation("ServerService.getAgentManifests", (options = {}) =>
      Effect.gen(function* () {
        const response = yield* transport.request("server.agent_manifests", {}, options);

        return yield* decodeHerdrWire(
          parseAgentManifestStatus,
          response.result,
          response.requestId,
        );
      }),
    ),
    reloadAgentManifests: defineHerdrOperation(
      "ServerService.reloadAgentManifests",
      (options = {}) =>
        Effect.gen(function* () {
          const response = yield* transport.request("server.reload_agent_manifests", {}, options);

          return yield* decodeHerdrWire(
            parseAgentManifests,
            response.result.manifests,
            response.requestId,
          );
        }),
    ),
    registerSshAgent: defineHerdrOperation(
      "ServerService.registerSshAgent",
      (input, options = {}) =>
        Effect.gen(function* () {
          const parsed = yield* decodeHerdrInput(
            "ServerService.registerSshAgent",
            parseServerSshAgentRegisterInput,
            input,
          );

          const opened = yield* transport.openStream(
            "server.ssh_agent.register",
            { socketPath: parsed.socketPath },
            options,
          );

          return { requestId: opened.requestId, closed: Stream.runDrain(opened.readBytes) };
        }),
    ),
  });
});

/**
 * Provides server operations while retaining the shared transport requirement.
 *
 * @category layers
 * @since 0.8.2
 */
export const serverServiceLayerWithoutDependencies: Layer.Layer<
  ServerService,
  never,
  HerdrTransport
> = Layer.effect(ServerService, makeServerService);

/**
 * Production server-service Layer using the ambient Herdr transport graph.
 *
 * @category layers
 * @since 0.8.2
 */
export const serverServiceLayer = serverServiceLayerWithoutDependencies.pipe(
  Layer.provide(herdrTransportLayer),
);
