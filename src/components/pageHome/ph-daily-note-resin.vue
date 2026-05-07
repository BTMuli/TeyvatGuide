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
        <span
          v-if="!showCountdown && fullTimeText"
          class="pdb-resin-fulltime clickable"
          :title="'点击查看倒计时'"
          @click="showCountdown = true"
        >
          {{ fullTimeText }}回满
        </span>
        <span
          v-if="showCountdown"
          :title="fullTimeText ? `${fullTimeText}回满` : ''"
          class="pdb-resin-countdown clickable"
          @click="showCountdown = false"
        >
          {{ formattedTime }}
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { stamp2FullTime, stamp2LastTime } from "@utils/toolFunc.js";

type PhDailyNoteResinProps = {
  currentResin: number;
  maxResin: number;
  recoveryTime: string;
};

const props = defineProps<PhDailyNoteResinProps>();

const remainedTime = ref<number>(0);
const initialCurrent = ref<number>(0);
const fullTimeText = ref<string>("");
const showCountdown = ref<boolean>(false);

const max = computed<number>(() => props.maxResin ?? 200);
const current = computed<number>(() => {
  const totalToRecover = max.value - initialCurrent.value;
  if (totalToRecover <= 0) return max.value;
  if (remainedTime.value <= 0) return max.value;
  const recovered = Math.floor(totalToRecover - remainedTime.value / 480);
  return Math.min(initialCurrent.value + Math.max(recovered, 0), max.value);
});
const full = computed<boolean>(() => current.value === max.value);
const formattedTime = computed<string>(() => {
  if (remainedTime.value <= 0) return "已恢复满";
  return stamp2LastTime(remainedTime.value * 1000);
});

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
  initialCurrent.value = props.currentResin || 0;
  const time = props.recoveryTime;
  remainedTime.value = typeof time === "string" ? parseInt(time) : time || 0;
  fullTimeText.value = stamp2FullTime(remainedTime.value);
}

function startTimer(): void {
  if (remainedTime.value <= 0) return;
  timer = setInterval(() => {
    if (remainedTime.value > 0) {
      remainedTime.value -= 1;
      if (remainedTime.value <= 0) {
        fullTimeText.value = "";
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
    background: linear-gradient(135deg, var(--tgc-od-red) 0%, var(--box-bg-2) 80%);
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
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;

  .pdb-resin-fulltime {
    flex-shrink: 0;
    color: var(--tgc-od-orange);
    font-size: 10px;
    font-weight: 600;

    &.clickable {
      cursor: pointer;

      &:hover {
        font-style: italic;
      }
    }
  }

  .pdb-resin-countdown {
    overflow: hidden;
    text-overflow: ellipsis;

    &.clickable {
      cursor: pointer;

      &:hover {
        font-style: italic;
      }
    }
  }
}
</style>
