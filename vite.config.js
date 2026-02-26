import { join, dirname } from "path";
import { fileURLToPath } from "url";
import vue from "@vitejs/plugin-vue";

const path = fileURLToPath(import.meta.url);

export default {
  root: join(dirname(path), "client"),
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./client/tests/setup.ts",
  },
};
