import recommendedEffect from "@timmo001/oxlint-rules/configs/recommended-effect";

export default {
  extends: [recommendedEffect],
  ignorePatterns: ["dist/**", "src/generated/**"],
  rules: {
    // Endpoint and fixture errors leave payloads out on purpose. A decode error holds the input, such
    // as terminal text, so keeping it as a cause would leak that into errors and logs.
    "timmo-effect/require-cause-when-narrowing": "off",
  },
  options: {
    typeAware: true,
    maxWarnings: 0,
  },
};
