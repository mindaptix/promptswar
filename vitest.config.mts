import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/app/api/**/*.ts", "src/shared/server/*.ts", "src/modules/earnings/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
