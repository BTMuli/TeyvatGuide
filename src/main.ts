/**
 * @file main.ts
 * @description Main entry
 * @since Beta v0.3.4
 */

import { createApp } from "vue";
import { createVuetify } from "vuetify";

import App from "./App.vue";
import router from "./router";
import store from "./store";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.css";

if (import.meta.env.MODE === "development") {
  await import("@vue/devtools").then((i) => {
    i.default.connect(/* host, port */);
  });
}

createApp(App).use(router).use(store).use(createVuetify()).mount("#app");
