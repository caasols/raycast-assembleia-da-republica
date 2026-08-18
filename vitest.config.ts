import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // .tsx sources are compiled with the automatic JSX runtime, so neither the
  // commands nor the tests need React in scope.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      // @raycast/api is supplied by the Raycast runtime and has no resolvable
      // Node entry point, so Vite cannot load it. See test/raycast-api-stub.tsx.
      "@raycast/api": fileURLToPath(new URL("./test/raycast-api-stub.tsx", import.meta.url)),
    },
  },
  test: {
    // Node by default; the component tests opt into jsdom per file with a
    // `@vitest-environment jsdom` docblock.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
      // No types-only module exists yet; add it here (with a note) when one does.
      exclude: ["src/**/*.test.{ts,tsx}"],
      // src/ is fully covered today; the thresholds hold that line, so new
      // uncovered code fails `npm run test:coverage` rather than drifting.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
