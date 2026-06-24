<!-- 改变帖子视图 -->
<template>
  <div
    class="tpw2-box"
    :class="postViewWide ? '' : 'active'"
    :title="postViewWide ? '切换为窄屏视图' : '切换为宽屏视图'"
    data-html2canvas-ignore
  >
    <div class="tpw2-btn" @click="switchPostWidth()">
      <v-icon size="20">
        {{ postViewWide ? "mdi-arrow-collapse-horizontal" : "mdi-arrow-expand-horizontal" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";

const { postViewWide } = storeToRefs(useAppStore());

function switchPostWidth(): void {
  postViewWide.value = !postViewWide.value;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tpw2-box {
  @include github-styles.github-card;

  position: fixed;
  z-index: 1;
  top: 112px;
  left: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:active {
    transform: scale(0.92);
  }

  &.active {
    animation: width-pulse 0.3s ease;
    background: var(--tgc-btn-1);
    box-shadow: 1px 3px 6px var(--common-shadow-2);
    color: var(--btn-text);
  }

  &:hover:not(.active) {
    background: var(--common-shadow-1);
    transform: scale(1.05);
  }
}

@keyframes width-pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}

.dark .tpw2-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);

  &:not(.active) {
    @include github-styles.github-card("dark");

    &:hover {
      background: var(--common-shadow-6);
    }
  }
}

.tpw2-btn {
  position: relative;
  z-index: 1;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}
</style>
