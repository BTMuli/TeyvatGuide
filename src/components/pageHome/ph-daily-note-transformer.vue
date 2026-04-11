<!-- 参量质变仪显示组件 -->
<template>
  <div :class="{ 'ph-dnt-ready': ready }" class="ph-dnt-box">
    <div class="pdb-trans-icon">
      <img alt="参量质变仪" src="/UI/daily/trans.webp" />
    </div>
    <div class="pdb-trans-info">
      <div class="pdb-trans-title">参量质变仪</div>
      <div class="pdb-trans-desc">
        {{ valueText }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { stamp2LastTime } from "@utils/toolFunc.js";

type PhDailyNoteTransformerProps = {
  trans: TGApp.Game.DailyNote.TransformerData;
};

const props = defineProps<PhDailyNoteTransformerProps>();

const remainedTime = ref<number>(0);
const formattedTime = ref<string>("");

let timer: ReturnType<typeof setInterval> | null = null;

const valueText = computed<string>(() => {
  if (!props.trans.obtained && !props.trans.recovery_time.reached) {
    return "恢复中";
  }
  if (props.trans.obtained || props.trans.recovery_time.reached) {
    return "可使用";
  }
  return formattedTime.value;
});
const ready = computed<boolean>(() => props.trans.obtained || props.trans.recovery_time.reached);

onMounted(() => {
  initTime();
  startTimer();
});

onUnmounted(() => {
  stopTimer();
});

watch(
  () => props.trans.recovery_time,
  () => {
    initTime();
    stopTimer();
    startTimer();
  },
  { deep: true },
);

function initTime(): void {
  const time = props.trans.recovery_time;
  if (time) {
    const hours = time.hour || 0;
    const minutes = time.minute || 0;
    const seconds = time.second || 0;
    remainedTime.value = hours * 3600 + minutes * 60 + seconds;
  } else {
    remainedTime.value = 0;
  }
  updateFormattedTime();
}

function startTimer(): void {
  if (remainedTime.value <= 0 || props.trans.obtained || props.trans.recovery_time.reached) return;

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
    formattedTime.value = "0 小时 0 分钟 0 秒";
    return;
  }

  formattedTime.value = stamp2LastTime(remainedTime.value * 1000);
}
</script>
<style lang="scss" scoped>
.ph-dnt-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
  transition: all 0.3s ease;

  &.ph-dnt-ready {
    background: linear-gradient(135deg, var(--tgc-od-orange) 0%, var(--box-bg-2) 80%);
  }
}

.pdb-trans-icon {
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

.pdb-trans-info {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pdb-trans-title {
  font-family: var(--font-title);
  font-size: 13px;
  white-space: nowrap;
}

.pdb-trans-desc {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdb-trans-value {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
}
</style>
