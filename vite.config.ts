/**
 * vite 配置文件
 * @since Beta v0.9.1
 */

import { sentryVitePlugin } from "@sentry/vite-plugin";
import vue from "@vitejs/plugin-vue";
import postcssPresetEnv from "postcss-preset-env";
import { defineConfig } from "vite";
import VueDevtools from "vite-plugin-vue-devtools";
import vuetify from "vite-plugin-vuetify";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify(),
    VueDevtools(),
    sentryVitePlugin({
      org: "teyvat-guide",
      project: "teyvat-guide",
      authToken: process.env.SENTRY_AUTH_TOKEN ?? "",
      release: {
        name: process.env.VITE_SENTRY_RELEASE,
        setCommits: { auto: true },
      },
    }),
  ],
  resolve: {
    alias: {
      "@/": "/src/",
      "@styles/": "/src/assets/styles/",
      "@comp/": "/src/components/",
      "@enum/": "/src/enum/",
      "@hooks/": "/src/hooks/",
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
  build: {
    chunkSizeWarningLimit: 8192,
    sourcemap: true,
  },
  css: {
    postcss: { plugins: [postcssPresetEnv({ stage: 1, features: { "color-function": true } })] },
  },
});
