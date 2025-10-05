import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      exclude: ["dist/**", "tests/**", "vitest.config.ts"],
      reportsDirectory: "coverage"
    }
  }
});
