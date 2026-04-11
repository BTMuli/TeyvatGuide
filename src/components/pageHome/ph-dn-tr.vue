<!-- ph-daily-note-task-reward -->
<template>
  <v-icon
    opacity="0.5"
    v-if="props.reward.status === dnEnum.task.INVALID"
    color="var(--tgc-od-white)"
    size="16"
  >
    mdi-cancel
  </v-icon>
  <v-icon
    v-else-if="props.reward.status === dnEnum.task.UNFINISHED"
    color="var(--tgc-od-white)"
    size="16"
  >
    mdi-checkbox-blank-badge-outline
  </v-icon>
  <v-icon
    v-else-if="props.reward.status === dnEnum.task.FINISHED"
    color="var(--tgc-od-red)"
    size="16"
  >
    mdi-gift
  </v-icon>
  <v-icon v-else color="var(--tgc-od-green)" size="16"> mdi-checkbox-marked-outline </v-icon>
</template>
<script lang="ts" setup>
import dnEnum from "@enum/dailyNote.js";

type PhDnTrProps = { reward: TGApp.Game.DailyNote.DailyTaskReward };
const props = defineProps<PhDnTrProps>();
</script>
