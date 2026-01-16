/**
 * 应用入口
 * @since Beta v0.9.2
 */

import type { FeedbackInternalOptions } from "@sentry/core";
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
    Sentry.feedbackAsyncIntegration(<FeedbackInternalOptions>{
      // 🌗 主题与注入行为
      colorScheme: "system",
      autoInject: true,
      triggerLabel: "",

      // 📝 表单标题与按钮文案
      formTitle: "问题反馈",
      cancelButtonLabel: "取消",
      submitButtonLabel: "提交反馈",
      successMessageText: "感谢您的反馈，我们将尽快处理。",

      // 🧑 用户信息字段
      nameLabel: "反馈人",
      namePlaceholder: "请输入您的姓名或昵称",
      emailLabel: "电子邮箱",
      emailPlaceholder: "请输入您的邮箱地址，以便我们与您联系",

      // 🐛 问题描述字段
      messageLabel: "问题描述",
      messagePlaceholder: "请详细描述您遇到的问题及复现步骤",
      isRequiredLabel: "（必填）",

      // 📸 截图工具相关
      addScreenshotButtonLabel: "添加当前页面截图",
      removeScreenshotButtonLabel: "移除截图",
      highlightToolText: "标记重点区域",
      removeHighlightText: "移除标记",
      hideToolText: "遮挡敏感信息",
    }),
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
