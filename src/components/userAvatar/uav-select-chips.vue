<!-- 选项组件 -->
<template>
  <div class="uav-select-chips-box">
    <!-- ALL -->
    <v-chip
      key="all"
      :size="props.size"
      class="uav-scb-all"
      title="全部"
      variant="elevated"
      @click.stop="toggleAll"
    >
      <template #prepend>
        <div :class="{ active: isAllSelected }" class="icon-wrap">
          <v-icon color="var(--tgc-od-green)">mdi-check</v-icon>
        </div>
      </template>
      <div :class="{ shifted: isAllSelected }" class="all-label">
        <slot :selected="isAllSelected" name="all">All</slot>
      </div>
    </v-chip>
    <v-chip-group v-model="selected" filter multiple>
      <!-- Options -->
      <v-chip
        v-for="item in props.items"
        :key="item.value"
        :class="selected.includes(item.value) ? 'selected' : ''"
        :size="props.size"
        :title="item.title"
        :value="item.value"
        class="uav-scb-item"
        filter
        variant="elevated"
      >
        <template #filter>
          <v-icon color="var(--tgc-od-red)">mdi-check</v-icon>
        </template>
        <div class="uav-scb-inner">
          <TMiImg v-if="item.icon" :src="item.icon" alt="icon" />
          <span>{{ item.label }}</span>
        </div>
      </v-chip>
    </v-chip-group>
  </div>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed, defineProps } from "vue";

export type UavSelectChipsItem = {
  /** 渲染文本 */
  label?: string;
  /** 渲染图标 */
  icon?: string;
  /** 提示文本 */
  title: string;
  /** 选项值 */
  value: string;
};
type UavSelectChipsProps = {
  /** 选项 */
  items: Array<UavSelectChipsItem>;
  /** 尺寸 */
  size?: "x-small" | "small" | "default" | "large" | "x-large" | number;
};

const props = withDefaults(defineProps<UavSelectChipsProps>(), { size: "default" });

const selected = defineModel<Array<string>>("selected", { default: [] });
const isAllSelected = computed<boolean>(() => {
  if (!props.items || props.items.length === 0) return false;
  return props.items.every((i) => selected.value.includes(i.value.toString()));
});
const iconHeight = computed<string>(() => {
  switch (props.size) {
    case "x-small":
      return "12px";
    case "small":
      return "16px";
    case "default":
      return "20px";
    case "large":
      return "24px";
    case "x-large":
      return "32px";
    default:
      return `${props.size}px`;
  }
});

async function toggleAll(): Promise<void> {
  if (isAllSelected.value) {
    selected.value = [];
  } else {
    selected.value = props.items.map((i) => i.value);
  }
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.uav-select-chips-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.uav-scb-all {
  @include github-styles.github-tag-dark-gen(#41b883);

  --icon-size: 16px;
  --icon-gap: 2px;

  display: inline-flex;
  align-items: center;

  .icon-wrap {
    display: inline-flex;
    overflow: hidden;
    width: 0;
    align-items: center;
    justify-content: center;
    margin-right: 0;
    opacity: 0;
    transition:
      width 0.3s ease-in-out,
      opacity 0.3s ease-in-out,
      margin-right 0.3s ease-in-out;

    &.active {
      width: var(--icon-size);
      margin-right: var(--icon-gap);
      opacity: 1;
    }
  }

  .all-label {
    display: inline-block;
    transform: translateX(0);
    transition: transform var(--anim-duration) var(--anim-ease);
    will-change: transform;
  }
}

.uav-scb-item {
  @include github-styles.github-tag-dark-gen(#548af7);

  position: relative;

  &.selected {
    @include github-styles.github-tag-dark-gen(#fb7299);
  }
}

.uav-scb-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 2px;

  img {
    position: relative;
    height: v-bind(iconHeight); /* stylelint-disable-line value-keyword-case */
  }
}
</style>
