<template>
  <div class="tab-box">
    <img alt="App" class="tab-icon" src="/icon.webp" />
    <div class="tab-info click" title="点击前往 Github Release" @click="toRelease()">
      TeyvatGuide Beta
    </div>
    <div class="tab-info">{{ versionApp }}_{{ buildTime }}</div>
    <div class="tab-links">
      <div class="tab-link" title="点击加入反馈群" @click="toGroup()">
        <img alt="qq" src="/platforms/other/qq.webp" />
      </div>
      <div :title="`当前提交:${buildHash}`" class="tab-link" @click="toGithub()">
        <img alt="github" src="/platforms/other/github.webp" />
      </div>
      <div class="tab-link" title="点击查看商店页面" @click="toStore()">
        <img alt="store" src="/platforms/other/microsoft-store.webp" />
      </div>
      <div class="tab-link" title="点击查看更新说明" @click="toSite()">
        <v-icon color="white">mdi-update</v-icon>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { openUrl } from "@tauri-apps/plugin-opener";
import { onMounted, ref } from "vue";

// @ts-expect-error import.meta
const buildTime = import.meta.env.VITE_BUILD_TIME;
// @ts-expect-error import.meta
const buildHash = import.meta.env.VITE_COMMIT_HASH;
const versionApp = ref<string>();

onMounted(async () => (versionApp.value = await app.getVersion()));

async function toRelease(): Promise<void> {
  await openUrl("https://github.com/BTMuli/TeyvatGuide/releases/latest");
}

async function toGroup(): Promise<void> {
  await openUrl("https://qm.qq.com/q/hUxIfSWluo");
}

async function toGithub(): Promise<void> {
  await openUrl(`https://github.com/BTMuli/TeyvatGuide/commit/${buildHash}`);
}

async function toStore(): Promise<void> {
  await openUrl("https://apps.microsoft.com/detail/9NLBNNNBNSJN");
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
  text-shadow: 0 0 2px #13547acc;
  word-break: break-all;
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
