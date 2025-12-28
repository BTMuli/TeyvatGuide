<!-- 选项组件 -->
<template>
  <div class="uav-select-chips-box">
    <v-chip-group :model-value="result" multiple>
      <!-- ALL -->
      <v-chip
        :size="props.size"
        :value="'__all__'"
        class="uav-scb-all"
        filter
        title="全部"
        variant="elevated"
        @click="toggleAll()"
      >
        <template #filter>
          <v-icon color="var(--tgc-od-green)">mdi-check</v-icon>
        </template>
        <slot :selected="selectAll" name="all">All</slot>
      </v-chip>
      <!-- Options -->
      <v-chip
        v-for="(item, idx) in props.items"
        :key="idx"
        :size="props.size"
        :title="getItemTitle(item)"
        :value="getItemValue(item)"
        class="uav-scb-item"
        filter
        variant="elevated"
        @click="selectItem(item)"
      >
        <template #filter>
          <v-icon color="var(--tgc-od-blue)">mdi-check</v-icon>
        </template>
        <slot :selected="result.includes(getItemValue(item))" name="item">
          <template v-if="typeof item === 'string'">{{ item }}</template>
          <template v-else>
            <TMiImg v-if="item.icon" :src="item.icon" alt="icon" />
            <span>{{ item.label }}</span>
          </template>
        </slot>
      </v-chip>
    </v-chip-group>
  </div>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed, defineModel, defineProps, shallowRef, triggerRef, watch } from "vue";

export type UavSelectChipsItem = {
  label: string;
  icon?: string;
  title?: string;
  value: string;
};
type UavSelectChipsProps = {
  /** 选项 */
  items: Array<string | UavSelectChipsItem>;
  /** 尺寸 */
  size?: "x-small" | "small" | "default" | "large" | "x-large" | number;
};

const props = withDefaults(defineProps<UavSelectChipsProps>(), { size: "default" });
const result = shallowRef<Array<string>>([]);
const model = defineModel<Array<string>>({ default: [] });
const selectAll = computed<boolean>(() => result.value.includes("__all__"));
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

watch(
  () => result.value,
  () => {
    model.value = result.value.filter((i) => i !== "__all__");
  },
);

async function toggleAll(): Promise<void> {
  if (result.value.includes("__all__")) {
    result.value = [];
  } else {
    result.value = ["__all__", ...props.items.map(getItemValue)];
  }
}

function getItemValue(item: UavSelectChipsItem | string): string {
  if (typeof item === "string") return item;
  return item.value;
}

function getItemTitle(item: UavSelectChipsItem | string): string | undefined {
  if (typeof item === "string") return item;
  return item.title;
}

function selectItem(item: UavSelectChipsItem | string): void {
  const itemValue = getItemValue(item);
  if (result.value.includes(itemValue)) {
    result.value = result.value.filter((i) => i !== "__all__" && i !== itemValue);
  } else {
    result.value.push(itemValue);
    if (result.value.length === props.items.length) {
      result.value.push("__all__");
    }
    triggerRef(result);
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
}

.uav-scb-item {
  @include github-styles.github-tag-dark-gen(#548af7);

  position: relative;

  img {
    position: relative;
    height: v-bind(iconHeight); /* stylelint-disable-line value-keyword-case */
  }
}
</style>
