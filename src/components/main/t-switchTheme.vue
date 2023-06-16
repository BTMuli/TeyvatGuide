<template>
  <div class="switch-box">
    <div class="switch-btn" @click="switchTheme()">
      <v-icon style="color:var(--theme-switch-icon)">
        {{ themeGet === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
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
  get () {
    return appStore.theme;
  },
  set (value: string) {
    appStore.theme = value;
  },
});

onMounted(async () => {
  await listenOnTheme();
});

async function switchTheme () {
  appStore.changeTheme();
  await event.emit("readTheme", themeGet.value);
}

async function listenOnTheme () {
  await event.listen("readTheme", (e) => {
    const theme = e.payload as string;
    themeGet.value = theme === "default" ? "default" : "dark";
  });
}
</script>
<style lang="css" scoped>
.switch-box {
  position: absolute;
  top: 20px;
  left: 20px;
  cursor: pointer;
  border-radius: 50%;
  border: var(--theme-switch-icon) 2px solid;
}

.switch-box:hover {
  opacity: 0.8;
}

.switch-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px;
}
</style>
