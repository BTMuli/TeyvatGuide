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
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { computed, onMounted, ref } from "vue";

import { useAppStore } from "../../store/modules/app";

const appStore = useAppStore();
const versionApp = ref<string>();
const buildTime = computed(() => appStore.buildTime);

onMounted(async () => {
  versionApp.value = await app.getVersion();
});

function toRelease() {
  window.open("https://github.com/BTMuli/TeyvatGuide/releases/latest");
}

function toGroup() {
  window.open("https://h5.qun.qq.com/s/3cgX0hJ4GA");
}

function toGithub() {
  window.open("https://github.com/BTMuli/TeyvatGuide");
}

function toStore() {
  window.open("https://www.microsoft.com/store/productId/9NLBNNNBNSJN");
}
</script>
<style lang="css" scoped>
.tab-box {
  position: fixed;
  top: 16px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background-image: linear-gradient(to bottom, rgb(19 84 122 / 80%), rgb(128 208 199 / 80%));
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
