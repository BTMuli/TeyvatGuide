/**
 * @file main.ts
 * @description Main entry
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.3
 */

// vue
import { createApp } from "vue";
import App from "./App.vue";
// 路由
import router from "./router";
import store from "./store";
// Vuetify
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import { createVuetify } from "vuetify";
// 全局样式
import "./assets/index.css";
// gt.js
import "https://static.geetest.com/static/js/gt.0.4.9.js";

if (import.meta?.env?.MODE === "development") {
  await import("@vue/devtools").then((i) => {
    i.default.connect(/* host, port */);
  });
}

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
