import { createApp } from "vue";
import App from "./App.vue";
// 路由
import router from "./router";
// Pinia
import { pinia } from "./store";

createApp(App).use(router).use(pinia).mount("#app");
