<!-- ph-daily-note-attendance-reward -->
<template>
  <div :class="{ non: isNon }" class="ph-dn-ar-box">
    <v-progress-circular
      :color="proc"
      :model-value="(Math.min(props.reward.progress, 2000) / 2000) * 100"
      :size="14"
      :width="2"
      class="ph-dn-ar-progress"
    />
    <span v-if="reward.status !== dnEnum.attendance.UNFINISHED" class="ph-dn-ar-icon">
      <v-icon :color="proc" size="8">
        {{ midIcon }}
      </v-icon>
    </span>
  </div>
</template>
<script lang="ts" setup>
import dnEnum from "@enum/dailyNote.js";
import { computed } from "vue";

type PhDnArProps = { reward: TGApp.Game.DailyNote.AttendanceReward };
const props = defineProps<PhDnArProps>();

const proc = computed<string>(() => {
  switch (props.reward.status) {
    case dnEnum.attendance.INVALID:
    case dnEnum.attendance.NON_REWARD:
      return "var(--tgc-od-white)";
    case dnEnum.attendance.UNFINISHED:
      return "var(--tgc-od-blue)";
    case dnEnum.attendance.TAKEN:
      return "var(--tgc-od-green)";
    case dnEnum.attendance.WAIT_TAKEN:
      return "var(--tgc-od-red)";
    case dnEnum.attendance.FORBID:
      return "var(--tgc-od-orange)";
    default:
      return "var(--tgc-od-white)";
  }
});
const isNon = computed<boolean>(() => {
  switch (props.reward.status) {
    case dnEnum.attendance.INVALID:
    case dnEnum.attendance.NON_REWARD:
    case dnEnum.attendance.FORBID:
      return true;
    case dnEnum.attendance.UNFINISHED:
    case dnEnum.attendance.TAKEN:
    case dnEnum.attendance.WAIT_TAKEN:
      return false;
    default:
      return true;
  }
});
const midIcon = computed<string>(() => {
  switch (props.reward.status) {
    case dnEnum.attendance.INVALID:
      return "mdi-close";
    case dnEnum.attendance.NON_REWARD:
      return "mdi-cancel";
    case dnEnum.attendance.TAKEN:
      return "mdi-check";
    case dnEnum.attendance.WAIT_TAKEN:
      return "mdi-gift";
    case dnEnum.attendance.FORBID:
      return "mdi-cancel";
    case dnEnum.attendance.UNFINISHED:
    default:
      return "mdi-info";
  }
});
</script>
<style lang="scss" scoped>
.ph-dn-ar-box {
  position: relative;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;

  &.non {
    opacity: 0.5;
  }
}

.ph-dn-ar-progress {
  position: absolute;
  z-index: 1;
}

.ph-dn-ar-icon {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
