/**
 * @file main.ts
 * @description 应用入口
 * @since Beta v0.4.0
 */

import { createApp } from "vue";
import { createVuetify } from "vuetify";

import App from "./App.vue";
import router from "./router";
import store from "./store";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.css";

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
