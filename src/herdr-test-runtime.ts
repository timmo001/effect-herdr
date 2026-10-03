/**
 * Effect-native Vitest execution boundary.
 * @since 0.8.2
 */
import { Arbitrary, Cause, Effect, type Scope } from "effect";
import type { TestContext } from "vitest";

/**
 * Runs a scoped Effect body at the Vitest boundary, closing its resources before the test settles.
 * Explicit Vitest context ties interruption to the test's abort signal; undefined context denotes a
 * suite lifecycle hook.
 * @category Testing
 * @since 0.8.2
 */
export function runHerdrTest<A, E>(
  context: TestContext | undefined,
  effect: Effect.Effect<A, E, Scope.Scope>,
): Promise<A> {
  return Effect.runPromise(Effect.scoped(effect), { signal: context?.signal });
}

/**
 * Checks generated cases with Effect, retaining shrinking diagnostics and interruption.
 * @category Testing
 * @since 0.9.0
 */
export const assertHerdrProperty = Effect.fnUntraced(function* <A, E, R>(
  arbitrary: Arbitrary.Arbitrary<A>,
  property: (value: A) => Effect.Effect<unknown, E, R>,
  options: Arbitrary.CheckOptions,
) {
  const result = yield* Arbitrary.checkEffect(
    arbitrary,
    (value) =>
      Effect.suspend(() => property(value)).pipe(
        Effect.as(true),
        Effect.catchCause((cause): Effect.Effect<never, E | Cause.Cause<E>> =>
          Cause.hasInterrupts(cause) ? Effect.failCause(cause) : Effect.fail(cause),
        ),
      ),
    options,
  );
  const failure = Arbitrary.formatCheckFailure(result);
  if (failure !== undefined) return yield* Effect.die(new Error(failure));
});
