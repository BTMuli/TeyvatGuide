<!-- 探索派遣单项 -->
<template>
  <div class="dni-exp-item">
    <div class="dni-exp-icon">
      <img :src="expedition.avatar_side_icon" alt="角色" />
    </div>
    <div class="dni-exp-info">
      <div v-if="isFinished" class="dni-exp-status finished">已完成</div>
      <div v-else class="dni-exp-info-content">
        <div class="dni-exp-status">派遣中</div>
        <div class="dni-exp-time">{{ formattedTime }}</div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from "vue";

import { stamp2LastTime } from "@utils/toolFunc.js";

type PhDailyNoteExpeditionProps = {
  expedition: TGApp.Game.DailyNote.Expedition;
};

const props = defineProps<PhDailyNoteExpeditionProps>();

const remainedTime = ref<number>(0);
const isFinished = ref<boolean>(false);
const formattedTime = ref<string>("");

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  initTime();
  startTimer();
});

onUnmounted(() => {
  stopTimer();
});

watch(
  () => props.expedition.remained_time,
  () => {
    initTime();
    stopTimer();
    startTimer();
  },
);

function initTime(): void {
  const time = props.expedition.remained_time;
  remainedTime.value = typeof time === "string" ? parseInt(time) : time;
  isFinished.value = props.expedition.status === "Finished" || remainedTime.value <= 0;
  updateFormattedTime();
}

function startTimer(): void {
  if (isFinished.value) return;

  timer = setInterval(() => {
    if (remainedTime.value > 0) {
      remainedTime.value -= 1;
      updateFormattedTime();

      if (remainedTime.value <= 0) {
        isFinished.value = true;
        stopTimer();
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
    formattedTime.value = "0 小时 0 分钟 0 秒";
    return;
  }

  formattedTime.value = stamp2LastTime(remainedTime.value * 1000);
}
</script>
<style lang="scss" scoped>
.dni-exp-item {
  position: relative;
  display: flex;
  width: fit-content;
  height: 32px;
  align-items: center;
  padding-right: 12px;
  border-radius: 20px;
  background: linear-gradient(to right, var(--box-bg-2), transparent 120%);
  gap: 6px;
}

.dni-exp-icon {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--box-bg-4);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.dni-exp-info {
  position: relative;
  display: flex;
  align-items: center;
}

.dni-exp-info-content {
  position: relative;
  display: flex;
  flex-direction: column;
}

.dni-exp-status {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.finished {
    color: var(--tgc-od-green);
    font-weight: bold;
  }
}

.dni-exp-time {
  overflow: hidden;
  color: var(--box-text-1);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
