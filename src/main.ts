/**
 * @file main.ts
 * @description Main entry
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
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

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
