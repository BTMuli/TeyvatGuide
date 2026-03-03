<template>
  <div :title="props.name" class="tur-hi-box">
    <img ref="TurHiiRef" :src="props.icon" alt="bg" class="tur-hi-bg" @error="handleIconError" />
    <img v-if="isErr" alt="empty" class="tur-hi-empty" src="/UI/app/empty.webp" />
    <span class="tur-hi-name">{{ props.name }}</span>
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { str2Color } from "@utils/colorFunc.js";
import { storeToRefs } from "pinia";
import { computed, ref, useTemplateRef } from "vue";

type TurHomeNameProps = { name: string; icon: string };

const { theme } = storeToRefs(useAppStore());

const props = defineProps<TurHomeNameProps>();

const isErr = ref<boolean>(false);
const iconEl = useTemplateRef<HTMLImageElement>("TurHiiRef");
const isDarkMode = computed<boolean>(() => theme.value === "dark");
const color = computed<string>(() =>
  tag2Color(`${props.name}_${encodeURIComponent(props.icon)}`, isDarkMode.value),
);
const bg = computed<string>(() => `rgba(${color.value.slice(4, -1)}, 0.5)`);

function handleIconError(e: Event) {
  console.debug(e);
  if (!iconEl.value) return;
  isErr.value = true;
  iconEl.value.style.display = "none";
}

function tag2Color(str: string, isDarkMode: boolean = false): string {
  const adjust = isDarkMode ? 90 : 120;
  return str2Color(str, adjust);
}
</script>
<style lang="scss" scoped>
.tur-hi-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-1);
}

.tur-hi-bg {
  z-index: 0;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
  opacity: 0.8;
}

.dark .tur-hi-bg {
  opacity: 1;
}

.tur-hi-empty {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.tur-hi-name {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  backdrop-filter: blur(10px);
  background: v-bind(bg);
  border-bottom-left-radius: 12px;
  color: v-bind(color);
  line-height: 24px;
  text-shadow: 0 0 4px rgb(0 0 0 / 50%);
}
</style>
