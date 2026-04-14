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
      <div class="pdb-quest-chips">
        <span
          v-for="q in questList"
          :key="q.id"
          :class="getQuestClass(q.status)"
          :title="q.chapter_num"
          class="pdb-quest-chip"
        >
          {{ q.chapter_title }}
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import dnEnum from "@enum/dailyNote.js";

type PhDailyNoteQuestProps = { quest: TGApp.Game.DailyNote.ArchonQuestProgress };

const props = defineProps<PhDailyNoteQuestProps>();

const questList = computed(() => props.quest.list);

function getQuestClass(stat: TGApp.Game.DailyNote.ArchonStatusEnum): string {
  switch (stat) {
    case dnEnum.quest.FINISHED:
      return "finished";
    case dnEnum.quest.ONGOING:
      return "ongoing";
    case dnEnum.quest.NOT_OPEN:
      return "not-open";
    default:
      return "";
  }
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.ph-dnq-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
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
  white-space: nowrap;
}

.pdb-quest-chips {
  display: flex;
  overflow: hidden;
  flex-wrap: wrap;
  gap: 4px;
}

.pdb-quest-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 4px;
  border-radius: 10px;
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;

  &.finished {
    @include github-styles.github-tag-dark-gen(#98c379ff);
  }

  &.ongoing {
    @include github-styles.github-tag-dark-gen(#d19a66ff);
  }

  &.not-open {
    @include github-styles.github-tag-dark-gen(#e06c75ff);
  }
}
</style>
