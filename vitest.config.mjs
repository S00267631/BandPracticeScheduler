import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Compiled CommonJS copies in dist are not runnable Vitest source tests.
    include: ["src/tests/**/*.test.ts"],
  },
});
