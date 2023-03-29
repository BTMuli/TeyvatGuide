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
// plugins
// @ts-ignore
import JsonViewer from "vue-json-viewer";

createApp(App).use(router).use(store).use(createVuetify()).use(JsonViewer).mount("#app");
