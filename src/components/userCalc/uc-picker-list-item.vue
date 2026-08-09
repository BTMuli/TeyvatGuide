<!-- 养成计算-角色/武器选择列表项 -->
<template>
  <button
    :aria-pressed="selected"
    :class="{ selected }"
    :title
    class="ucpli-item"
    type="button"
    @click="emit('select')"
  >
    <UcItemIcon :alt="name" :icon="icon" :primaryBadge :size="56" :star="star" />
    <span class="ucpli-content">
      <span class="ucpli-heading">
        <span class="ucpli-name">{{ name }}</span>
        <span :class="{ owned }" class="ucpli-owned">{{ owned ? "已拥有" : "未拥有" }}</span>
      </span>
      <span class="ucpli-details">
        <span v-for="detail in details" :key="detail">{{ detail }}</span>
      </span>
      <span v-if="secondary && secondary.length > 0" class="ucpli-details secondary">
        <span v-for="detail in secondary" :key="detail">{{ detail }}</span>
      </span>
    </span>
    <v-icon v-if="selected" class="ucpli-selected" size="18">mdi-check-circle</v-icon>
  </button>
</template>

<script lang="ts" setup>
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";

type UcPickerListItemProps = {
  title: string;
  name: string;
  icon: string;
  star: number;
  owned: boolean;
  selected: boolean;
  details: Array<string>;
  primaryBadge?: string;
  secondary?: Array<string>;
};

const { secondary = [] } = defineProps<UcPickerListItemProps>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<style lang="scss" scoped>
.ucpli-item {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 70px;
  align-items: center;
  padding: 7px 9px 7px 7px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  color: var(--common-text-title);
  cursor: pointer;
  gap: 10px;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: var(--tgc-od-blue);
    background: var(--common-shadow-t-1);
  }

  &.selected {
    border-color: var(--tgc-od-blue);
  }
}

.ucpli-content,
.ucpli-heading,
.ucpli-details {
  display: flex;
  min-width: 0;
}

.ucpli-content {
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.ucpli-heading {
  align-items: center;
  gap: 8px;
}

.ucpli-name {
  overflow: hidden;
  font-family: var(--font-title);
  font-size: 15px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucpli-owned {
  flex: none;
  padding: 2px 6px;
  border: 1px solid var(--tgc-od-orange);
  border-radius: 999px;
  background: var(--common-shadow-t-1);
  color: var(--tgc-od-orange);
  font-size: 10px;
  line-height: 1.2;

  &.owned {
    border-color: var(--tgc-od-green);
    background: var(--common-shadow-t-1);
    color: var(--tgc-od-green);
  }
}

.ucpli-details {
  flex-wrap: wrap;
  align-items: center;
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 1.35;

  > span:not(:last-child)::after {
    margin: 0 6px;
    color: var(--common-text-sub);
    content: "·";
  }

  &.secondary {
    color: var(--common-text-sub);
    font-size: 10px;
    line-height: 1.25;
    opacity: 0.72;
  }
}

.ucpli-selected {
  flex: none;
  color: var(--tgc-od-blue);
  filter: drop-shadow(0 0 4px var(--common-shadow-2));
}
</style>
