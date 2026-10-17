import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    // PGlite boots a WASM Postgres per file; under a full parallel run that can exceed the 10s default.
    hookTimeout: 60_000,
    // PGlite boots a WASM Postgres per file; under a full parallel run that can exceed the 10s default.
    hookTimeout: 60_000,
    // PGlite boots a WASM Postgres per file; under a full parallel run that can exceed the 10s default.
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["src/app/api/**/*.ts", "src/shared/server/*.ts", "src/modules/earnings/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
