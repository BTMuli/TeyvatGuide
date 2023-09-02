<template>
  <div class="switch-box">
    <div class="switch-btn" @click="switchTheme()">
      <v-icon>
        {{ themeGet === "default" ? "mdi-weather-night" : "mdi-weather-sunny" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted } from "vue";
// tauri
import { event } from "@tauri-apps/api";
// store
import { useAppStore } from "../../store/modules/app";

// store
const appStore = useAppStore();
// theme
const themeGet = computed({
  get() {
    return appStore.theme;
  },
  set(value: string) {
    appStore.theme = value;
  },
});

onMounted(async () => {
  await listenOnTheme();
});

async function switchTheme(): Promise<void> {
  appStore.changeTheme();
  await event.emit("readTheme", themeGet.value);
}

async function listenOnTheme(): Promise<void> {
  await event.listen("readTheme", (e) => {
    const theme = <string>e.payload;
    themeGet.value = theme === "default" ? "default" : "dark";
  });
}
</script>
<style lang="css" scoped>
.switch-box {
  position: absolute;
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
