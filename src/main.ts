/**
 * 应用入口
 * @since Beta v0.7.2
 */

import { createApp } from "vue";
import { createVuetify } from "vuetify";

import App from "./App.vue";
import router from "./router/index.js";
import store from "./store/index.js";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.scss";

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
