<template>
  <div class="switch-box" :title="isDefault ? '切换到深色模式' : '切换到浅色模式'">
    <div class="switch-btn" @click="switchTheme()">
      <v-icon size="20">
        {{ isDefault ? "mdi-weather-night" : "mdi-weather-sunny" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { event } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted } from "vue";

const appStore = useAppStore();
const { theme } = storeToRefs(appStore);
const isDefault = computed<boolean>(() => theme.value === "default");

let themeListener: UnlistenFn | null = null;

onMounted(async () => {
  themeListener = await event.listen<string>("readTheme", (e: Event<string>) => {
    theme.value = e.payload === "default" ? "default" : "dark";
  });
});

async function switchTheme(): Promise<void> {
  appStore.changeTheme();
  await event.emit("readTheme", theme.value);
}

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
});
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.switch-box {
  position: fixed;
  z-index: 1;
  top: 16px;
  left: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-btn-1);
  box-shadow: 1px 3px 6px var(--common-shadow-2);
  color: var(--btn-text);
  cursor: pointer;
}

.dark .switch-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);
}

.switch-btn {
  position: relative;
  z-index: 1;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}
</style>
