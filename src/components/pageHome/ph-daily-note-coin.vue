<!-- 洞天宝钱显示组件 -->
<template>
  <div :class="{ 'ph-dnc-max': full }" class="ph-dnc-box">
    <div class="pdb-coin-icon">
      <img alt="洞天宝钱" src="/UI/daily/coin.webp" />
    </div>
    <div class="pdb-coin-info">
      <div class="pdb-coin-title">
        <span>洞天宝钱</span>
        <span>{{ current }}/{{ max }}</span>
      </div>
      <div class="pdb-coin-desc">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { stamp2LastTime } from "@utils/toolFunc.js";

type PhDailyNoteCoinProps = {
  currentCoin: number;
  maxCoin: number;
  recoveryTime: string;
};

const props = defineProps<PhDailyNoteCoinProps>();

const current = ref<number>(0);
const max = ref<number>(0);
const remainedTime = ref<number>(0);
const formattedTime = ref<string>("");
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
  current.value = props.currentCoin || 0;
  max.value = props.maxCoin || 0;
  const time = props.recoveryTime;
  remainedTime.value = typeof time === "string" ? parseInt(time) : time || 0;
  updateFormattedTime();
}

function startTimer(): void {
  if (remainedTime.value <= 0) return;

  timer = setInterval(() => {
    if (remainedTime.value > 0) {
      remainedTime.value -= 1;
      updateFormattedTime();
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
    formattedTime.value = "已存满";
    return;
  }

  formattedTime.value = stamp2LastTime(remainedTime.value * 1000);
}
</script>
<style lang="scss" scoped>
.ph-dnc-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
  transition: all 0.3s ease;

  &.ph-dnc-max {
    background: linear-gradient(135deg, var(--tgc-od-orange) 0%, var(--box-bg-2) 80%);
  }
}

.pdb-coin-icon {
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

.pdb-coin-info {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pdb-coin-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 13px;
  white-space: nowrap;
}

.pdb-coin-desc {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
