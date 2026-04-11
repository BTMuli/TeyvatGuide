<!-- 原粹树脂显示组件 -->
<template>
  <div :class="{ 'ph-dnr-max': full }" class="ph-dnr-box">
    <div class="pdb-resin-icon">
      <img alt="原粹树脂" src="/UI/daily/resin.webp" />
    </div>
    <div class="pdb-resin-info">
      <div class="pdb-resin-title">
        <span>原粹树脂</span>
        <span>{{ current }}/{{ max }}</span>
      </div>
      <div class="pdb-resin-desc">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { stamp2LastTime } from "@utils/toolFunc.js";

type PhDailyNoteResinProps = {
  currentResin: number;
  maxResin: number;
  recoveryTime: string;
};

const props = defineProps<PhDailyNoteResinProps>();

const current = ref<number>(0);
const remainedTime = ref<number>(0);
const formattedTime = ref<string>("");
const initialRecoveryTime = ref<number>(0);
const max = computed<number>(() => props.maxResin ?? 200);
const full = computed<boolean>(() => current.value === max.value);

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  initTime();
  startTimer();
});

onUnmounted(() => {
  stopTimer();
});

watch(
  () => props.recoveryTime,
  () => {
    initTime();
    stopTimer();
    startTimer();
  },
);

function initTime(): void {
  current.value = props.currentResin || 0;
  const time = props.recoveryTime;
  remainedTime.value = typeof time === "string" ? parseInt(time) : time || 0;
  initialRecoveryTime.value = remainedTime.value;
  updateFormattedTime();
}

function startTimer(): void {
  if (remainedTime.value <= 0) return;

  timer = setInterval(() => {
    if (remainedTime.value > 0) {
      remainedTime.value -= 1;
      updateFormattedTime();
      const totalSecondsPassed = initialRecoveryTime.value - remainedTime.value;
      const resinToRecover = Math.floor(totalSecondsPassed / 540);
      const newCurrent = Math.min(current.value + resinToRecover, max.value);
      if (newCurrent !== current.value) {
        current.value = newCurrent;
      }
    }
  }, 1000);
}

function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function updateFormattedTime(): void {
  if (remainedTime.value <= 0) {
    formattedTime.value = "已恢复满";
    return;
  }

  formattedTime.value = stamp2LastTime(remainedTime.value * 1000);
}
</script>
<style lang="scss" scoped>
.ph-dnr-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
  transition: all 0.3s ease;

  &.ph-dnr-max {
    background: linear-gradient(135deg, var(--tgc-od-orange) 0%, var(--box-bg-2) 80%);
  }
}

.pdb-resin-icon {
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

.pdb-resin-info {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pdb-resin-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 13px;
  white-space: nowrap;
}

.pdb-resin-desc {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
