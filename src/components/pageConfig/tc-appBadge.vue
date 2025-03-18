<template>
  <div class="tab-box">
    <img class="tab-icon" src="/icon.webp" alt="App" />
    <div class="tab-info click" title="点击前往 Github Release" @click="toRelease()">
      TeyvatGuide Beta
    </div>
    <div class="tab-info">v{{ versionApp }}.{{ buildTime === "" ? "Dev" : buildTime }}</div>
    <div class="tab-links">
      <div class="tab-link" @click="toGroup()" title="点击加入反馈群">
        <img src="/platforms/other/qq.webp" alt="qq" />
      </div>
      <div class="tab-link" @click="toGithub()" title="点击查看仓库">
        <img src="/platforms/other/github.webp" alt="github" />
      </div>
      <div class="tab-link" @click="toStore()" title="点击查看商店页面">
        <img src="/platforms/other/microsoft-store.webp" alt="store" />
      </div>
      <div class="tab-link" @click="toSite()" title="点击查看更新说明">
        <v-icon color="white">mdi-update</v-icon>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { openUrl } from "@tauri-apps/plugin-opener";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import { useAppStore } from "@/store/modules/app.js";

const { buildTime } = storeToRefs(useAppStore());
const versionApp = ref<string>();

onMounted(async () => (versionApp.value = await app.getVersion()));

async function toRelease(): Promise<void> {
  await openUrl("https://github.com/BTMuli/TeyvatGuide/releases/latest");
}

async function toGroup(): Promise<void> {
  await openUrl("https://h5.qun.qq.com/s/3cgX0hJ4GA");
}

async function toGithub(): Promise<void> {
  await openUrl("https://github.com/BTMuli/TeyvatGuide");
}

async function toStore(): Promise<void> {
  await openUrl("https://www.microsoft.com/store/productId/9NLBNNNBNSJN");
}

async function toSite(): Promise<void> {
  await openUrl("https://app.btmuli.ink/docs/TeyvatGuide/changelogs.html");
}
</script>
<style lang="css" scoped>
.tab-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
  box-shadow: 0 0 10px var(--common-shadow-2);
}

.tab-icon {
  width: 200px;
  aspect-ratio: 1 / 1;
}

.tab-info {
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 14px;
  text-align: center;
  text-shadow: 0 0 2px rgb(19 84 122 / 80%);
}

.tab-info.click {
  color: var(--tgc-yellow-1);
  cursor: pointer;
}

.tab-links {
  display: flex;
  backdrop-filter: blur(20px);
  column-gap: 10px;
}

.tab-link {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tab-link img {
  width: 32px;
  height: 32px;
}
</style>
