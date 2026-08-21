<template>
  <div :title="props.name" class="tur-hi-box">
    <img ref="TurHiiRef" :src="props.icon" alt="bg" class="tur-hi-bg" @error="handleIconError" />
    <img v-if="isErr" alt="empty" class="tur-hi-empty" src="/UI/app/empty.webp" />
    <span class="tur-hi-name">{{ props.name }}</span>
  </div>
</template>
<script lang="ts" setup>
import { str2Color } from "@utils/colorFunc.js";
import { computed, ref, useTemplateRef } from "vue";

type TurHomeNameProps = { name: string; icon: string };

const props = defineProps<TurHomeNameProps>();

const isErr = ref<boolean>(false);
const iconEl = useTemplateRef<HTMLImageElement>("TurHiiRef");
const bg = computed<string>(() =>
  toFrostBg(str2Color(`${props.name}_${encodeURIComponent(props.icon)}`, -60)),
);

/** 实色转半透明毛玻璃底色 */
function toFrostBg(rgb: string): string {
  return rgb.replace(/^rgb\((.+)\)$/, "rgba($1, 0.35)");
}

function handleIconError(e: Event) {
  console.debug(e);
  if (!iconEl.value) return;
  isErr.value = true;
  iconEl.value.style.display = "none";
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
  justify-content: flex-start;
  padding: 4px;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: v-bind(bg);
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  box-shadow: 0 0 10px var(--tgc-dark-2);
  color: var(--tgc-white-1);
}
</style>
