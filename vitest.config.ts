import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { testEnv } from "./test/env.ts";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // "server-only" throws outside the React server build, and tests import
      // server code directly.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**"],
    environment: "node",
    env: testEnv,
    globalSetup: "./test/global-setup.ts",
    setupFiles: ["./test/setup.ts"],
    // All test files share one database, so they run one after another.
    fileParallelism: false,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
