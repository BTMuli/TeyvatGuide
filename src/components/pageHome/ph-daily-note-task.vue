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
      <div class="pdb-task-task-content">
        <div class="pdb-task-task-row">
          <span class="pdb-task-task-label">日常</span>
          <template v-for="i in props.task?.task_rewards" :key="i">
            <v-icon
              v-if="i.status === 'TaskRewardStatusFinished'"
              color="var(--tgc-od-green)"
              size="14"
            >
              mdi-check
            </v-icon>
            <v-icon v-else color="var(--tgc-od-white)" size="14"> mdi-square-outline</v-icon>
          </template>
        </div>
        <div v-if="attendanceVisible" class="pdb-task-task-row">
          <span class="pdb-task-task-label">历练</span>
          <div class="pdb-task-attendance-list">
            <div
              v-for="reward in attendanceRewards"
              :key="reward.progress"
              class="pdb-task-attendance-item"
            >
              <v-progress-circular
                :model-value="(Math.min(reward.progress, 2000) / 2000) * 100"
                :size="14"
                :width="2"
                class="pdb-task-attendance-progress"
                color="var(--tgc-od-orange)"
              />
              <span
                v-if="reward.status !== 'AttendanceRewardStatusUnfinished'"
                class="pdb-task-attendance-icon"
              >
                <v-icon
                  v-if="reward.status === 'AttendanceRewardStatusTakenAward'"
                  color="var(--tgc-od-green)"
                  size="8"
                >
                  mdi-check
                </v-icon>
                <v-icon v-else color="var(--tgc-od-red)" size="8"> mdi-gift </v-icon>
              </span>
            </div>
          </div>
          <span v-if="hasUnclaimedAttendance" class="pdb-task-task-warn"> 可领取 </span>
        </div>
      </div>
    </div>
    <div class="pdb-task-value"></div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type PhDailyNoteTaskProps = {
  task?: TGApp.Game.DailyNote.DailyTask;
};

const props = defineProps<PhDailyNoteTaskProps>();

const attendanceVisible = computed((): boolean => {
  return props.task?.attendance_visible ?? false;
});

const attendanceRewards = computed((): Array<TGApp.Game.DailyNote.AttendanceReward> => {
  return props.task?.attendance_rewards ?? [];
});

const hasUnclaimedAttendance = computed((): boolean => {
  return (
    props.task?.attendance_rewards?.some(
      (r) => r.progress >= 2000 && r.status !== "AttendanceRewardStatusTakenAward",
    ) ?? false
  );
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
  min-height: 64px;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 6px;
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
  font-weight: bold;
  white-space: nowrap;
}

.pdb-task-task-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pdb-task-task-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pdb-task-task-label {
  color: var(--box-text-2);
  font-size: 10px;
  white-space: nowrap;
}

.pdb-task-task-warn {
  color: var(--tgc-od-orange);
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
}

.pdb-task-attendance-list {
  display: flex;
  align-items: center;
  column-gap: 2px;
}

.pdb-task-attendance-item {
  position: relative;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
}

.pdb-task-attendance-progress {
  position: absolute;
  z-index: 1;
}

.pdb-task-attendance-icon {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdb-task-attendance-progress-text {
  position: absolute;
  z-index: 2;
  color: var(--box-text-1);
  font-size: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.pdb-task-stored {
  display: flex;
  align-items: center;
  color: var(--box-text-2);
  font-size: 10px;
  gap: 2px;
}
</style>
