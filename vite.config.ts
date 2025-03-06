/**
 * @file vite.config.ts
 * @description vite 配置文件
 * @since Beta v0.7.2
 */

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import VueDevtools from "vite-plugin-vue-devtools";
import vuetify from "vite-plugin-vuetify";

import buildTimePlugin from "./src/utils/TGBuild.js";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify(), buildTimePlugin(), VueDevtools()],
  resolve: {
    alias: {
      "@/": "/src/",
      "@comp/": "/src/components/",
      "@Hutao/": "/src/plugins/Hutao/",
      "@Mys/": "/src/plugins/Mys/",
      "@Sqlite/": "/src/plugins/Sqlite/",
      "@Bili/": "/src/plugins/Bili/",
    },
  },
  server: {
    port: 4000,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 4001 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  esbuild: { supported: { "top-level-await": true } },
  build: { chunkSizeWarningLimit: 4096 },
});
