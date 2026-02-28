<template>
  <div
    class="tpw-box"
    :class="isPined ? 'active' : ''"
    :title="isPined ? '取消置顶' : '窗口置顶'"
    data-html2canvas-ignore
  >
    <div class="tpw-btn" @click="switchPin()">
      <v-icon size="20">
        {{ isPined ? "mdi-pin-off" : "mdi-pin" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onMounted, ref } from "vue";

const isPined = ref<boolean>(false);

onMounted(async () => (isPined.value = await getCurrentWindow().isAlwaysOnTop()));

async function switchPin(): Promise<void> {
  isPined.value = !isPined.value;
  await getCurrentWindow().setAlwaysOnTop(isPined.value);
  showSnackbar.success(isPined.value ? "已将窗口置顶！" : "已经取消窗口置顶!");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tpw-box {
  @include github-styles.github-card;

  position: fixed;
  z-index: 1;
  top: 64px;
  left: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;

  &.active {
    background: var(--tgc-btn-1);
    box-shadow: 1px 3px 6px var(--common-shadow-2);
    color: var(--btn-text);
  }

  &:hover:not(.active) {
    background: var(--common-shadow-1);
  }
}

.dark .tpw-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);

  &:not(.active) {
    @include github-styles.github-card("dark");

    &:hover {
      background: var(--common-shadow-6);
    }
  }
}

.tpw-btn {
  position: relative;
  z-index: 1;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  rotate: 30deg;
}
</style>
