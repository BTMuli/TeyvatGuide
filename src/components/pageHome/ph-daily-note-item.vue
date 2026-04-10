<!-- 实时便笺单项 -->
<template>
  <div class="dni-container">
    <div class="dni-header">
      <div class="dni-header-title">
        <span>{{ props.account.nickname }}</span>
        <v-icon
          :size="16"
          color="var(--tgc-od-orange)"
          icon="mdi-refresh"
          variant="elevated"
          @click="handleRefresh"
        />
      </div>
      <div class="dni-header-append">
        <span>{{ props.account.gameUid }}</span>
        <span>{{ props.account.regionName }}</span>
      </div>
    </div>

    <div v-if="props.data" class="dni-content">
      <div class="dni-grid">
        <div class="dni-row">
          <PhDailyNoteResin
            :current-resin="props.data.current_resin"
            :max-resin="props.data.max_resin"
            :recovery-time="props.data.resin_recovery_time"
          />
          <PhDailyNoteCoin
            :current-coin="props.data.current_home_coin"
            :max-coin="props.data.max_home_coin"
            :recovery-time="props.data.home_coin_recovery_time"
          />
          <PhDailyNoteTransformer :trans="props.data.transformer" />
        </div>
        <div class="dni-row">
          <PhDailyNoteQuest :quest="props.data.archon_quest_progress" />
          <PhDailyNoteTask :task="props.data.daily_task" />
          <PhDailyNoteBoss
            :remain-resin-discount-num="props.data.remain_resin_discount_num"
            :resin-discount-num-limit="props.data.resin_discount_num_limit"
          />
        </div>
      </div>
      <div class="dni-exp-header">
        <span class="dni-exp-title">探索派遣</span>
        <span class="dni-exp-count">
          {{ props.data.current_expedition_num }}/{{ props.data.max_expedition_num }}
        </span>
      </div>
      <div class="dni-exp-grid">
        <PhDailyNoteExpedition
          v-for="expedition in props.data.expeditions"
          :key="expedition.avatar_side_icon"
          :expedition="expedition"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import PhDailyNoteExpedition from "./ph-daily-note-expedition.vue";
import PhDailyNoteResin from "./ph-daily-note-resin.vue";
import PhDailyNoteCoin from "./ph-daily-note-coin.vue";
import PhDailyNoteTransformer from "./ph-daily-note-transformer.vue";
import PhDailyNoteTask from "./ph-daily-note-task.vue";
import PhDailyNoteQuest from "./ph-daily-note-quest.vue";
import PhDailyNoteBoss from "./ph-daily-note-boss.vue";

type PhDailyNoteItemProps = {
  account: TGApp.Sqlite.Account.Game;
  data?: TGApp.Game.DailyNote.DnRes;
};

type TDailyNoteItemEmits = {
  (e: "refresh"): void;
};

const emits = defineEmits<TDailyNoteItemEmits>();
const props = defineProps<PhDailyNoteItemProps>();

function handleRefresh(): void {
  emits("refresh");
}
</script>
<style lang="scss" scoped>
.dni-container {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 6px;
}

.dni-header {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--common-shadow-1);
}

.dni-header-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-family: var(--font-title);
}

.dni-header-append {
  display: flex;
  align-items: center;
  column-gap: 4px;
  font-size: 12px;
}

.dni-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dni-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dni-row {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
}

.dni-item {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 6px;
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

.dni-title {
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.dni-desc {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dni-value {
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

.dni-exp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  gap: 8px;
}

.dni-exp-title {
  color: var(--box-text-1);
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: bold;
}

.dni-exp-count {
  color: var(--box-text-2);
  font-size: 11px;
}

.dni-exp-grid {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
