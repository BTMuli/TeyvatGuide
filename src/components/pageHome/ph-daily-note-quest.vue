<!-- 魔神任务显示组件 -->
<template>
  <div class="ph-dnq-box">
    <div class="pdb-quest-icon">
      <img alt="魔神任务" src="/UI/daily/mission.webp" />
    </div>
    <div class="pdb-quest-info">
      <div class="pdb-quest-title">
        <span>魔神任务</span>
        <span>
          {{
            props.quest.is_finish_all_mainline && props.quest.is_finish_all_interchapter
              ? "已完成"
              : `未完成:${props.quest.list.length}`
          }}
        </span>
      </div>
      <div class="pdb-quest-desc">
        <span v-for="q in props.quest.list" :key="q.id">
          {{ q.chapter_num }} {{ q.chapter_title }} {{ getQuestStatus(q.status) }}
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
type PhDailyNoteQuestProps = { quest: TGApp.Game.DailyNote.ArchonQuestProgress };

const props = defineProps<PhDailyNoteQuestProps>();

function getQuestStatus(stat: string): string {
  switch (stat) {
    case "StatusNotOpen":
      return "未开启";
    default:
      return stat;
  }
}
</script>
<style lang="scss" scoped>
.ph-dnq-box {
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

.pdb-quest-icon {
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

.pdb-quest-info {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.pdb-quest-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.pdb-quest-desc {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdb-quest-value {
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
