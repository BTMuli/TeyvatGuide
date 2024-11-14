<template>
  <div class="tpw-box" data-html2canvas-ignore>
    <div class="tpw-btn" @click="switchPin()" :title="isPined ? '取消置顶' : '窗口置顶'">
      <v-icon :color="isPined ? 'yellow' : 'inherit'">
        {{ isPined ? "mdi-pin-off" : "mdi-pin" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onMounted, ref } from "vue";

import showSnackbar from "../func/snackbar.js";

const isPined = ref<boolean>(false);

onMounted(async () => {
  // 因为无法获取窗口是否置顶，这边手动取消置顶
  // 详见：https://github.com/tauri-apps/tauri/issues/11078
  await getCurrentWindow().setAlwaysOnTop(false);
});

async function switchPin(): Promise<void> {
  isPined.value = !isPined.value;
  await getCurrentWindow().setAlwaysOnTop(isPined.value);
  showSnackbar.success(isPined.value ? "已将窗口置顶！" : "已经取消窗口置顶!");
}
</script>
<style lang="css" scoped>
.tpw-box {
  position: fixed;
  top: 70px;
  left: 20px;
  border: 2px solid var(--common-shadow-8);
  border-radius: 50%;
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }
}

.tpw-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  margin: 5px;
  rotate: 30deg;
}
</style>
