<template>
  <div class="switch-box" :title="themeGet === 'default' ? '切换到深色模式' : '切换到浅色模式'">
    <div class="switch-btn" @click="switchTheme()">
      <v-icon>
        {{ themeGet === "default" ? "mdi-weather-night" : "mdi-weather-sunny" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import { UnlistenFn, Event } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted } from "vue";

import { useAppStore } from "../../store/modules/app.js";

const appStore = useAppStore();
const themeGet = computed({
  get() {
    return appStore.theme;
  },
  set(value: string) {
    appStore.theme = value;
  },
});
let themeListener: UnlistenFn | null = null;

onMounted(async () => {
  themeListener = await listenOnTheme();
});

async function switchTheme(): Promise<void> {
  appStore.changeTheme();
  await event.emit("readTheme", themeGet.value);
}

async function listenOnTheme(): Promise<UnlistenFn> {
  return await event.listen("readTheme", (e: Event<string>) => {
    const theme = e.payload;
    themeGet.value = theme === "default" ? "default" : "dark";
  });
}

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
});
</script>
<style lang="css" scoped>
.switch-box {
  position: fixed;
  top: 20px;
  left: 20px;
  border: 2px solid var(--common-shadow-8);
  border-radius: 50%;
  cursor: pointer;
}

.switch-box:hover {
  opacity: 0.8;
}

.switch-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  margin: 5px;
}
</style>
