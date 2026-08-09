<template>
  <div class="twos-box">
    <div class="twos-icon">
      <v-icon size="20">mdi-map-marker-outline</v-icon>
    </div>
    <div class="twos-content">
      <span>{{ props.data.name }}</span>
      <span>{{ props.data.type }}</span>
    </div>
    <span class="twos-availability">{{ availability }}</span>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type TwoSourceProps = { data: TGApp.App.Material.Source };

const props = defineProps<TwoSourceProps>();

const accentColor = computed<string>(() => {
  if (!props.data || !props.data.days) return "var(--tgc-blue-2)";
  const days = props.data.days;
  const day = new Date().getDay();
  if (day === 0 || days.includes(day)) return "var(--tgc-pink-1)";
  return "var(--tgc-blue-2)";
});
const availability = computed<string>(() => {
  if (!props.data.days || props.data.days.length === 0) return "常驻获取";
  const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const days = props.data.days
    .map((day) => weekdayNames[day])
    .filter((day): day is string => day !== undefined);
  if (!days.includes("周日")) days.push("周日");
  return days.join(" / ");
});
</script>
<style lang="scss" scoped>
.twos-box {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  gap: 8px;
}

.twos-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--app-page-bg);
  color: v-bind(accentColor); /* stylelint-disable-line value-keyword-case */
}

.twos-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;

  span:first-child {
    overflow: hidden;
    color: var(--box-text-2);
    font-size: 14px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span:last-child {
    color: var(--box-text-4);
    font-size: 10px;
    line-height: 14px;
  }
}

.twos-availability {
  flex-shrink: 0;
  color: v-bind(accentColor); /* stylelint-disable-line value-keyword-case */
  font-size: 10px;
  line-height: 14px;
}
</style>
