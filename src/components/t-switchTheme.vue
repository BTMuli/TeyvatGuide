<template>
  <div class="switch-box">
    <div class="switch-btn" @click="swithcTheme()">
      <v-icon style="color:var(--theme-switch-icon)">
        {{ themeGet === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
// store
import { useAppStore } from "../store/modules/app";

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

function swithcTheme () {
  appStore.changeTheme();
  document.documentElement.className = themeGet.value;
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
