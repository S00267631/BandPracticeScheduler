import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Compiled CommonJS copies in dist are not runnable Vitest source tests.
    include: ["src/tests/**/*.test.ts"],
    // These preserved suites are fully commented out, so do not collect them.
    exclude: [
      "src/tests/requestValidation.test.ts",
      "src/tests/resourceErrors.test.ts",
      "src/tests/manualRequests.test.ts",
    ],
  },
});
