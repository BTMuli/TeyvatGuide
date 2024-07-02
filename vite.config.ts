/**
 * @file vite.config.ts
 * @description vite 配置文件
 * @since Beta v0.5.0
 */

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import VueDevtools from "vite-plugin-vue-devtools";
import vuetify from "vite-plugin-vuetify";

import buildTimePlugin from "./src/utils/TGBuild.js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify(), buildTimePlugin(), VueDevtools()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 4000,
    strictPort: true,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // rollup options
    rollupOptions: {
      // chunking
      output: {
        manualChunks(id) {
          // pnpm 依赖包路径格式为 本地路径/node_modules/.pnpm/包名@版本号/node_modules/依赖包名/文件路径
          if (id.includes("node_modules")) {
            const arr = id.split("node_modules/");
            return arr[2].split("/")[0];
          }
        },
      },
    },
  },
});
