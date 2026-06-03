import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "server-only": resolve(rootDir, "tests/server-only-stub.ts")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  }
});
