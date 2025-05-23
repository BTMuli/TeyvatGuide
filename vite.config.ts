/**
 * @file vite.config.ts
 * @description vite 配置文件
 * @since Beta v0.7.6
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
      "@styles/": "/src/assets/styles/",
      "@comp/": "/src/components/",
      "@Bili/": "/src/plugins/Bili/",
      "@Hutao/": "/src/plugins/Hutao/",
      "@Mys/": "/src/plugins/Mys/",
      "@Sql/": "/src/plugins/Sqlite/",
      "@Sqlm/": "/src/plugins/Sqlite/modules/",
      "@store/": "/src/store/modules/",
      "@utils/": "/src/utils/",
      "@req/": "/src/request/",
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
  build: { chunkSizeWarningLimit: 8192 },
});
