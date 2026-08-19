<!-- 实时便笺单项 -->
<template>
  <div ref="dniRef" :class="{ 'dni-current': cur }" class="dni-container">
    <div class="dni-header">
      <div class="dni-header-title">
        <span>{{ props.account.nickname }}</span>
        <span class="dni-header-acts" data-html2canvas-ignore>
          <v-icon
            :size="16"
            color="var(--tgc-od-orange)"
            icon="mdi-share-variant"
            variant="elevated"
            @click="handleShare"
          />
          <v-icon
            :size="16"
            color="var(--tgc-od-orange)"
            icon="mdi-refresh"
            variant="elevated"
            @click="handleRefresh"
          />
        </span>
      </div>
      <div class="dni-header-append">
        <span>{{ props.account.gameUid }}</span>
        <span>{{ props.account.regionName }}</span>
      </div>
    </div>
    <div v-if="props.data" class="dni-content">
      <div class="dni-grid">
        <!-- 日常 -->
        <div class="dni-row col-4">
          <PhDailyNoteResin
            :currentResin="props.data.current_resin"
            :maxResin="props.data.max_resin"
            :recoveryTime="props.data.resin_recovery_time"
          />
          <PhDailyNoteTask :task="props.data.daily_task" />
          <PhDailyNoteCoin
            :currentCoin="props.data.current_home_coin"
            :maxCoin="props.data.max_home_coin"
            :recoveryTime="props.data.home_coin_recovery_time"
          />
          <PhDailyNoteWeekAct :wap="props.data.week_active_progress" />
        </div>
        <!-- 周常 -->
        <div class="dni-row">
          <PhDailyNoteQuest :quest="props.data.archon_quest_progress" />
          <PhDailyNoteTransformer :trans="props.data.transformer" />
          <PhDailyNoteBoss
            :remainResinDiscountNum="props.data.remain_resin_discount_num"
            :resinDiscountNumLimit="props.data.resin_discount_num_limit"
          />
        </div>
      </div>
      <div class="dni-exp-grid">
        <PhDailyNoteExpedition v-for="(expedition, i) in expeditions" :key="i" :expedition />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import dnEnum from "@enum/dailyNote.js";
import TGShare from "@utils/TGShare.js";
import { computed, useTemplateRef } from "vue";

import PhDailyNoteBoss from "./ph-daily-note-boss.vue";
import PhDailyNoteCoin from "./ph-daily-note-coin.vue";
import PhDailyNoteExpedition from "./ph-daily-note-expedition.vue";
import PhDailyNoteQuest from "./ph-daily-note-quest.vue";
import PhDailyNoteResin from "./ph-daily-note-resin.vue";
import PhDailyNoteTask from "./ph-daily-note-task.vue";
import PhDailyNoteTransformer from "./ph-daily-note-transformer.vue";
import PhDailyNoteWeekAct from "./ph-daily-note-week-act.vue";

type PhDailyNoteItemProps = {
  account: TGApp.Sqlite.Account.Game;
  data?: TGApp.Game.DailyNote.DnRes;
  cur?: boolean;
};

type TDailyNoteItemEmits = {
  (e: "refresh"): void;
};

const emits = defineEmits<TDailyNoteItemEmits>();
const props = withDefaults(defineProps<PhDailyNoteItemProps>(), {
  cur: false,
});
const dniEl = useTemplateRef<HTMLDivElement>("dniRef");
const expeditions = computed<Array<TGApp.Game.DailyNote.Expedition>>(() => {
  if (!props.data) return [];
  let res: Array<TGApp.Game.DailyNote.Expedition> = [];
  res.push(...props.data.expeditions);
  if (res.length < props.data.max_expedition_num) {
    for (let i = 0; i < props.data.max_expedition_num - res.length; i++) {
      res.push({
        avatar_side_icon: "/UI/app/empty.webp",
        status: dnEnum.expedition.EMPTY,
        remained_time: "0",
      });
    }
  }
  return res;
});

function handleRefresh(): void {
  emits("refresh");
}

async function handleShare(): Promise<void> {
  if (!dniEl.value) return;
  await TGShare.modern(`便笺-${props.account.nickname}-${props.account.gameUid}`, dniEl.value, 2.5);
}
</script>
<style lang="scss" scoped>
.dni-container {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 4px;
  transition: border-color 0.3s ease;

  &.dni-current {
    border: 1px solid var(--common-shadow-2);
  }
}

.dni-header {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--common-shadow-1);
}

.dni-header-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  font-family: var(--font-title);
  font-weight: normal;
}

.dni-header-acts {
  display: flex;
  align-items: center;
  column-gap: 4px;
}

.dni-header-append {
  display: flex;
  align-items: center;
  column-gap: 4px;
  font-size: 12px;
}

.dni-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 8px;
}

.dni-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dni-row {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(3, 1fr);

  &.col-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

.dni-item {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
}

.dni-icon {
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

.dni-info {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.dni-exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-top: auto;
  gap: 8px;
}

.dni-exp-grid {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: auto;
  column-gap: 12px;
}

@media (width <= 900px) {
  .dni-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 600px) {
  .dni-grid {
    grid-template-columns: 1fr;
  }
}
</style>
