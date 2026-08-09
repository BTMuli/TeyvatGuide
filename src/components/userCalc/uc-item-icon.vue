<!-- 养成计算-角色/武器图标 -->
<template>
  <div :class="{ circular }" :style="iconStyle" class="uci-box">
    <img :src="`/icon/bg/${star}-Star.webp`" alt="background" class="uci-bg" />
    <img :alt :src="icon" class="uci-icon" />
    <img v-if="primaryBadge" :alt :src="primaryBadge" class="uci-badge primary" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

type UcItemIconProps = {
  star: number;
  icon: string;
  alt: string;
  primaryBadge?: string;
  size?: number;
  circular?: boolean;
};

const props = withDefaults(defineProps<UcItemIconProps>(), {
  primaryBadge: undefined,
  size: 72,
  circular: false,
});

const iconStyle = computed<Record<string, string>>(() => ({
  "--uci-size": `${props.size}px`,
}));
</script>

<style lang="scss" scoped>
.uci-box {
  position: relative;
  overflow: hidden;
  width: var(--uci-size);
  height: var(--uci-size);
  flex-shrink: 0;
  border-radius: 4px;

  &.circular {
    border-radius: 50%;
  }
}

.uci-bg,
.uci-icon {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  object-fit: cover;
}

.uci-badge {
  position: absolute;
  z-index: 2;
  width: 28%;
  height: 28%;
  filter: drop-shadow(0 0 4px #00000099);
  object-fit: contain;

  &.primary {
    top: 4px;
    left: 4px;
  }
}
</style>
