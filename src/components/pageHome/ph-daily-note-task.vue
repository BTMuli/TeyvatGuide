<!-- 每日委托显示组件 -->
<template>
  <div class="ph-dnta-box">
    <div class="pdb-task-icon">
      <img alt="每日委托" src="/UI/daily/task.webp" />
    </div>
    <div class="pdb-task-info">
      <div class="pdb-task-title-row">
        <div class="pdb-task-title">
          <span>每日委托</span>
          <span>{{ taskStatus }}</span>
        </div>
        <div v-if="task?.stored_attendance" class="pdb-task-stored" title="长效历练点">
          <v-icon color="var(--tgc-od-red)" size="12">mdi-circle</v-icon>
          <span>{{ task.stored_attendance }}</span>
        </div>
      </div>
      <div class="pdb-task-content">
        <PhDnTr v-for="(reward, i) in props.task?.task_rewards" :key="i" :reward />
        <template v-if="attendanceVisible">
          <PhDnAr v-for="(reward, i) in props.task?.attendance_rewards" :key="i" :reward="reward" />
        </template>
      </div>
    </div>
    <div class="pdb-task-value"></div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import PhDnTr from "./ph-dn-tr.vue";
import PhDnAr from "@comp/pageHome/ph-dn-ar.vue";

type PhDailyNoteTaskProps = {
  task?: TGApp.Game.DailyNote.DailyTask;
};

const props = defineProps<PhDailyNoteTaskProps>();

const attendanceVisible = computed((): boolean => {
  return props.task?.attendance_visible ?? false;
});

const taskStatus = computed((): string => {
  if (!props.task) return "";
  const { finished_num, total_num } = props.task;
  if (finished_num === total_num) {
    if (props.task.is_extra_task_reward_received) return "已完成";
    return `${finished_num}/${total_num} 可领取`;
  }
  return `${finished_num}/${total_num}`;
});
</script>
<style lang="scss" scoped>
.ph-dnta-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
}

.pdb-task-icon {
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

.pdb-task-info {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.pdb-task-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.pdb-task-title {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 13px;
  white-space: nowrap;
}

.pdb-task-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.pdb-task-stored {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 10px;
  gap: 2px;
}
</style>
