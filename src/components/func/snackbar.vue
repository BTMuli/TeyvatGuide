<!-- Snackbar 组件 -->
<template>
  <transition name="func-snackbar">
    <div v-show="show" class="func-snackbar-container">
      <div class="func-snackbar">
        <slot name="text">
          <span class="func-snackbar-text">{{ data.text }}</span>
        </slot>
      </div>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";

import { SnackbarParams } from "./snackbar.js";

const props = defineProps<SnackbarParams>();
const data = shallowRef<SnackbarParams>(props);
const show = ref<boolean>(false);
const bgColor = computed(() => data.value.color);

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | undefined = undefined;

onMounted(() => displayBox(props));

// 根据输入的颜色转换为 hex 格式
function transColor(color: string): string {
  if (color.startsWith("#")) return color;
  switch (color) {
    case "success":
      return "#7ebd21";
    case "error":
      return "#e63f5a";
    case "warn":
      return "#ecb349";
    case "cancel":
      return "#2C313C";
    case "info":
      return "#1E9CEF";
    default:
      return color;
  }
}

function getTimer(): void {
  show.value = false;
}

function displayBox(params: SnackbarParams): void {
  data.value = {
    text: params.text,
    color: transColor(params.color),
    timeout: params.timeout,
  };
  show.value = true;
  if (timer != undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  timer = setTimeout(getTimer, data.value.timeout);
}

onUnmounted(() => {
  if (timer != undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
});

defineExpose({ displayBox });
</script>
<style lang="scss" scoped>
.func-snackbar-enter-active,
.func-snackbar-leave-active {
  transition: all 0.3s;
}

.func-snackbar-enter-from,
.func-snackbar-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.func-snackbar-enter-to,
.func-snackbar-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.func-snackbar-container {
  position: fixed;
  z-index: var(--tgi-snackbar);
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 80px;
  align-items: center;
  justify-content: center;
}

.func-snackbar {
  display: flex;
  min-width: 200px;
  max-width: calc(100% - 40px);
  min-height: 40px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 5px;
  background-color: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
  box-shadow: 0 0 10px #00000033;
  word-break: break-all;
}

.func-snackbar-text {
  color: #ffffffff;
  font-size: 16px;
  font-weight: 500;
}
</style>
