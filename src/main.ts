/**
 * 应用入口
 * @since Beta v0.9.2
 */

import * as Sentry from "@sentry/vue";
import { createApp, defineCustomElement } from "vue";
import { createVuetify } from "vuetify";

import App from "./App.vue";
import TLink from "./components/web/t-link.vue";
import router from "./router/index.js";
import store from "./store/index.js";

import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./assets/index.scss";

const app = createApp(App);
customElements.define("t-link", defineCustomElement(TLink));

Sentry.init({
  app,
  dsn: "https://8d59057c08ff381e1fccf3c9e97c6a6c@o4510617609175040.ingest.de.sentry.io/4510617659506768",
  release: import.meta.env.VITE_SENTRY_RELEASE,
  enableLogs: true,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["error"] }),
    Sentry.browserTracingIntegration({ router }),
  ],
  beforeSend(event, hint) {
    console.log(hint);
    // Check if it is an exception, and if so, show the report dialog
    // if (event.exception && event.event_id) {
    //   Sentry.showReportDialog({ eventId: event.event_id });
    // }
    return event;
  },
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

Sentry.setTag("commitHash", import.meta.env.VITE_COMMIT_HASH);
Sentry.setTag("buildTime", import.meta.env.VITE_BUILD_TIME);

app.use(router).use(store).use(createVuetify()).mount("#app");
