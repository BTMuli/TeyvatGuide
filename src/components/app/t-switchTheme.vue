<template>
  <div class="switch-box" :title="theme === 'default' ? '切换到深色模式' : '切换到浅色模式'">
    <div class="switch-btn" @click="switchTheme()">
      <v-icon>
        {{ theme === "default" ? "mdi-weather-night" : "mdi-weather-sunny" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import { Event, UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted } from "vue";

import { useAppStore } from "../../store/modules/app.js";

const { theme } = storeToRefs(useAppStore());
const appStore = useAppStore();
let themeListener: UnlistenFn | null = null;

onMounted(async () => {
  themeListener = event.listen("readTheme", (e: Event<string>) => {
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
