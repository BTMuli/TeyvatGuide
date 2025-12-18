<template>
  <span :title="`点击跳转#${props.tag}#`" class="tag-label">
    {{ props.tag }}
  </span>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { str2Color } from "@utils/colorFunc.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

type TpcTagProps = { tag: string };

const props = defineProps<TpcTagProps>();
const { theme } = storeToRefs(useAppStore());
const isDarkMode = computed<boolean>(() => theme.value === "dark");
const tagColor = computed<string>(() => tag2Color(props.tag, isDarkMode.value));
const bgColor = computed<string>(() => `rgba(${tagColor.value.slice(4, -1)}, 0.18)`);

function tag2Color(str: string, isDarkMode: boolean = false): string {
  const adjust = isDarkMode ? 80 : -40;
  return str2Color(str, adjust);
}
</script>
<style lang="scss" scoped>
.tag-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 12px;
  background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
  color: v-bind(tagColor); /* stylelint-disable-line value-keyword-case */
  cursor: pointer;
  gap: 2px;

  &:hover {
    opacity: 0.8;
  }
}
</style>
