<template>
  <transition name="func-loading">
    <div v-show="showBox || showOuter" class="loading-overlay">
      <transition name="func-loading-inner">
        <div v-show="showInner" class="loading-container">
          <div class="loading-box">
            <div class="loading-title">
              <span>{{ data.title }}</span>
              <div class="loading-circle" v-show="!data.empty">
                <div />
                <div />
              </div>
            </div>
            <div class="loading-subtitle" v-show="data.subtitle && data.subtitle !== ''">
              {{ data.subtitle }}
            </div>
            <div class="loading-img">
              <img v-if="!data.empty" src="/source/UI/loading.webp" alt="loading" />
              <img v-else src="/source/UI/empty.webp" alt="empty" />
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from "vue";

import { LoadingParams } from "./loading.js";

const showBox = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);

const props = defineProps<LoadingParams>();
const data = shallowRef<LoadingParams>(props);

watch(
  () => showBox.value,
  async () => {
    if (showBox.value) {
      showOuter.value = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      showInner.value = true;
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    showInner.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    showOuter.value = false;
  },
);

onMounted(async () => await displayBox(props));

async function displayBox(params: LoadingParams): Promise<void> {
  if (!params.show) {
    showBox.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    data.value = { show: false, title: undefined, subtitle: undefined, empty: undefined };
    return;
  }
  data.value = {
    title: params.title || data.value.title,
    subtitle: params.subtitle || data.value.subtitle,
    empty: params.empty || data.value.empty,
    show: true,
  };
  showBox.value = true;
}

defineExpose({ displayBox });
</script>
<style lang="css" scoped>
.func-loading-outer-enter-active,
.func-loading-outer-leave-active,
.func-loading-inner-enter-active {
  transition: all 0.3s;
}

.func-loading-inner-leave-active {
  transition: all 0.5s ease-in-out;
}

.func-loading-inner-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.func-loading-inner-enter-to,
.func-loading-inner-leave-from {
  opacity: 1;
  transform: scale(1);
}

.func-loading-outer-enter-to,
.func-loading-outer-leave-from {
  opacity: 1;
}

.func-loading-outer-enter-from,
.func-loading-outer-leave-to {
  opacity: 0;
}

.func-loading-inner-leave-to {
  opacity: 0;
  transform: scale(0);
}

.loading-overlay {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  background: #00000080;
}

.loading-container {
  display: flex;
  width: 800px;
  min-height: 300px;
  box-sizing: border-box;
  padding: 15px;
  border-radius: 15px;
  background: #ffffff0d;
  box-shadow: 0 0 10px #00000080;
}

.loading-box {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: #f4d8a8ff 1px solid;
  border-radius: 5px;
  color: #f4d8a8ff;
}

.loading-title {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 600;
}

.loading-subtitle {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 25px;
  box-sizing: border-box;
  padding: 0 20px;
  font-size: 1rem;
  text-align: center;
  word-break: break-all;
}

.loading-img {
  display: flex;
  width: 100%;
  height: 200px;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 5px;
  }
}

/* loading */

.loading-circle,
.loading-circle > div {
  position: relative;
  box-sizing: border-box;
}

.loading-circle {
  display: block;
  width: 32px;
  height: 32px;
  color: #f4d8a8ff;
  font-size: 0;
}

.loading-circle > div {
  position: absolute;
  top: 50%;
  left: 50%;
  display: inline-block;
  border: 0 solid currentcolor;
  border-radius: 100%;
  background-color: currentcolor;
  float: none;
}

.loading-circle > div:first-child {
  position: absolute;
  width: 32px;
  height: 32px;
  border-width: 2px;
  border-style: solid;
  border-right-color: transparent;
  border-left-color: transparent;
  animation: ball-clip-rotate-pulse-rotate 1s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
  background: transparent;
}

.loading-circle > div:last-child {
  width: 16px;
  height: 16px;
  animation: ball-clip-rotate-pulse-scale 1s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}

@keyframes ball-clip-rotate-pulse-rotate {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  50% {
    transform: translate(-50%, -50%) rotate(180deg);
  }

  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes ball-clip-rotate-pulse-scale {
  0%,
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  30% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(0.15);
  }
}
</style>
