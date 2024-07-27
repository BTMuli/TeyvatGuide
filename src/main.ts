/**
 * @file main.ts
 * @description 应用入口
 * @since Beta v0.4.0
 */

import { createApp } from "vue";
import { createVuetify } from "vuetify";

import App from "./App.vue";
import router from "./router/index.js";
import store from "./store/index.js";
import "https://static.geetest.com/static/js/gt.0.4.9.js";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.css";

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
