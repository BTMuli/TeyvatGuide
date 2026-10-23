<!-- 分区/版块标签 -->
<template>
  <RouterLink class="cp-channel-tag" :to="to">
    <img v-if="icon" alt="" :src="icon" />
    <v-icon v-else aria-hidden="true" size="16">{{ fallbackIcon }}</v-icon>
    <span>{{ name }}</span>
  </RouterLink>
</template>

<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { str2Color } from "@utils/display/colorFunc.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

type CpChannelTagProps = {
  icon?: string;
  kind?: "forum" | "game";
  name: string;
  to: string;
};

const { icon, kind = "forum", name, to } = defineProps<CpChannelTagProps>();
const { theme } = storeToRefs(useAppStore());
const isDarkMode = computed<boolean>(() => theme.value === "dark");
const color = computed<string>(() => str2Color(name, isDarkMode.value ? 80 : -40));
const background = computed<string>(() => `rgba(${color.value.slice(4, -1)}, 0.18)`);
const fallbackIcon = computed<string>(() =>
  kind === "game" ? "mdi-gamepad-variant-outline" : "mdi-forum-outline",
);
</script>

<style lang="scss" scoped>
.cp-channel-tag {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  height: 20px;
  align-items: center;
  padding: 0 6px;
  border-radius: 12px;
  background: v-bind(background); /* stylelint-disable-line value-keyword-case */
  color: v-bind(color); /* stylelint-disable-line value-keyword-case */
  gap: 4px;
  text-decoration: none;

  img {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: cover;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}
</style>
