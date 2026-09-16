import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./frontend/src", import.meta.url)) },
  },
  test: {
    include: ["shared/test/**/*.test.ts", "backend/test/**/*.test.ts", "frontend/src/**/*.test.ts"],
    environment: "node",
  },
});
