<template>
  <iframe
    class="shop-description"
    :srcdoc="documentHtml"
    referrerpolicy="no-referrer"
    sandbox=""
    title="商品详细说明"
  />
</template>

<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { computed } from "vue";

const { content } = defineProps<{ content: string }>();
const appStore = useAppStore();
// 商品说明在无脚本、无同源权限的文档中展示，无法访问应用或登录凭据。
const documentHtml = computed<string>(
  () => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<style>
:root { color-scheme: ${appStore.theme === "dark" ? "dark" : "light"}; }
body { margin: 0; padding: 12px; font: 14px/1.6 sans-serif; overflow-wrap: anywhere; }
img, video, table { max-width: 100%; height: auto; }
p { margin: 0 0 12px; }
</style></head><body>${content}</body></html>`,
);
</script>

<style lang="scss" scoped>
.shop-description {
  width: 100%;
  height: 320px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
}
</style>
