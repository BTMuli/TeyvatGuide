/**
 * 应用入口
 * @since Beta v0.9.1
 */

import * as Sentry from "@sentry/vue";
import { createApp } from "vue";
import { createVuetify } from "vuetify";

import pkgJson from "../package.json" with { type: "json" };

import App from "./App.vue";
import router from "./router/index.js";
import store from "./store/index.js";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.scss";

const app = createApp(App);

Sentry.init({
  app,
  dsn: "https://8d59057c08ff381e1fccf3c9e97c6a6c@o4510617609175040.ingest.de.sentry.io/4510617659506768",
  release: `TeyvatGuide@${pkgJson.version}`,
  integrations: [],
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

app.use(router).use(store).use(createVuetify()).mount("#app");
