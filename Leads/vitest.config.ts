import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx", "tests/**/*.{test,spec}.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: { concurrent: false },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
