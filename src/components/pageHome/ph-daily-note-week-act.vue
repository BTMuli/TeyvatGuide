<!-- 励行修远进度组件 -->
<template>
  <div :class="{ 'pdnwa-incomplete': isTodayIncomplete }" class="pdnwa-box">
    <div class="pdnwa-icon">
      <img alt="励行修远" src="/UI/daily/week_act.webp" />
    </div>
    <div class="pdnwa-info">
      <div class="pdnwa-title-row">
        <span>励行修远</span>
        <span>{{ periodProgress }}</span>
      </div>
      <div class="pdnwa-content">
        <span class="pdnwa-dots">
          <v-icon v-for="idx in 7" :key="idx" :color="getDayColor(idx)" :size="14">
            {{ getDayIcon(idx) }}
          </v-icon>
        </span>
        <span class="pdnwa-progress-text">{{ weekProgress }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type PhDailyNoteWeekActProps = {
  wap?: TGApp.Game.DailyNote.WeekActiveProgress;
};

const props = withDefaults(defineProps<PhDailyNoteWeekActProps>(), {
  wap: undefined,
});

const weekProgress = computed<string>(() => {
  if (!props.wap) return "0/5";
  const { progress_current, progress_total } = props.wap;
  return `${progress_current}/${progress_total}`;
});
const periodProgress = computed<string>(() => {
  if (!props.wap) return "0/8";
  const { period_progress_current, period_progress_total } = props.wap;
  return `${period_progress_current}/${period_progress_total}`;
});
const weekDays = computed<Array<number>>(() => {
  if (!props.wap) return [];
  return props.wap.progress_current_arr;
});
const curWeekday = computed<number>(() => props.wap?.current_weekday ?? 1);
const isTodayIncomplete = computed<boolean>(() => {
  if (!props.wap) return false;
  const currentDay = props.wap.current_weekday ?? 1;
  if (weekDays.value.includes(currentDay)) return false;
  if (props.wap.progress_current >= props.wap.progress_total) return false;
  return props.wap.period_progress_current < props.wap.period_progress_total;
});

function getDayColor(day: number): string {
  if (weekDays.value.includes(day)) return "var(--tgc-od-green)";
  if (curWeekday.value > day) return "var(--tgc-od-white)";
  if (curWeekday.value === day) return "var(--tgc-od-red)";
  return "var(--tgc-od-blue)";
}

function getDayIcon(day: number): string {
  if (weekDays.value.includes(day)) return "mdi-check-circle";
  if (curWeekday.value < day) return "mdi-circle-outline";
  if (curWeekday.value === day) return "mdi-dots-horizontal-circle-outline";
  return "mdi-cancel";
}
</script>
<style lang="scss" scoped>
.pdnwa-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
  transition: all 0.3s ease;

  &.pdnwa-incomplete {
    background: linear-gradient(135deg, var(--tgc-od-orange) 0%, var(--box-bg-2) 80%);
  }
}

.pdnwa-icon {
  position: relative;
  overflow: hidden;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pdnwa-info {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.pdnwa-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 13px;
  gap: 4px;
}

.pdnwa-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.pdnwa-progress-text {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 10px;
  gap: 4px;
  white-space: nowrap;
}

.pdnwa-dots {
  display: flex;
  align-items: center;
}
</style>
