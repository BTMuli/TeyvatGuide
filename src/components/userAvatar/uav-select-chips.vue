<!-- 选项组件 -->
<template>
  <div class="uav-select-chips-box">
    <div class="uav-scb-actions">
      <v-chip
        key="all"
        :aria-pressed="isAllSelected"
        :class="{ selected: isAllSelected }"
        :size
        class="uav-scb-all"
        title="全选"
        variant="elevated"
        @click.stop="toggleAll"
      >
        <div class="uav-scb-inner">
          <slot :selected="isAllSelected" name="all">全选</slot>
        </div>
      </v-chip>
      <v-chip
        key="invert"
        :size
        class="uav-scb-invert"
        title="反选"
        variant="elevated"
        @click.stop="invertSelection"
      >
        <div class="uav-scb-inner">反选</div>
      </v-chip>
    </div>
    <v-chip-group v-model="selected" class="uav-scb-group" multiple>
      <!-- Options -->
      <v-chip
        v-for="item in props.items"
        :key="item.value"
        :aria-pressed="selected.includes(item.value)"
        :class="selected.includes(item.value) ? 'selected' : ''"
        :size
        :title="item.title"
        :value="item.value"
        class="uav-scb-item"
        variant="elevated"
      >
        <slot name="item" :item="item" :selected="selected.includes(item.value)">
          <div class="uav-scb-inner">
            <TMiImg v-if="item.icon" :src="item.icon" alt="icon" />
            <span>{{ item.label }}</span>
          </div>
        </slot>
        <div v-if="selected.includes(item.value)" class="uav-scb-selected">
          <v-icon color="var(--tgc-od-red)">mdi-check-circle</v-icon>
        </div>
      </v-chip>
    </v-chip-group>
  </div>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

export type UavSelectChipsItem = {
  /** 渲染文本 */
  label?: string;
  /** 渲染图标 */
  icon?: string;
  /** 图标背景 */
  iconBackground?: string;
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

const selected = defineModel<Array<string>>("selected", { required: true });

defineSlots<{
  all(props: { selected: boolean }): unknown;
  item(props: { item: UavSelectChipsItem; selected: boolean }): unknown;
}>();
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

function toggleAll(): void {
  if (isAllSelected.value) {
    selected.value = [];
  } else {
    selected.value = props.items.map((i) => i.value);
  }
}

function invertSelection(): void {
  const selectedValues = new Set<string>(selected.value);
  selected.value = props.items
    .filter((item) => !selectedValues.has(item.value))
    .map((item) => item.value);
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

  :deep(.v-chip--variant-elevated) {
    box-shadow: none;
  }
}

.uav-scb-actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.uav-scb-all,
.uav-scb-invert {
  backdrop-filter: blur(4px);

  --webkit-backdrop-filter: blur(4px);
}

.uav-scb-all {
  @include github-styles.github-tag-dark-gen(#41b883);

  &.selected {
    @include github-styles.github-tag-dark-gen(#ffb74d);
  }
}

.uav-scb-invert {
  @include github-styles.github-tag-dark-gen(#548af7);
}

.uav-scb-group {
  display: flex;
  flex-wrap: wrap;
  padding: 0;
  gap: 8px;
}

.uav-scb-item {
  @include github-styles.github-tag-dark-gen(#548af7);

  position: relative;
  backdrop-filter: blur(4px);

  --webkit-backdrop-filter: blur(4px);

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

.uav-scb-selected {
  position: absolute;
  right: -4px;
  bottom: -4px;
}
</style>
