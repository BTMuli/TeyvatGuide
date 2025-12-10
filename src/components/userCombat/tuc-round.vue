<!-- 剧诗单幕 -->
<template>
  <div class="tucr-box">
    <div class="tucr-title">
      <img
        :class="`stat_${props.round.is_get_medal}`"
        :src="`/icon/combat/${getIcon()}.webp`"
        alt="combat"
      />
      <span v-if="props.round.is_tarot" class="main">
        圣牌挑战·{{ props.round.tarot_serial_no }}
      </span>
      <span v-else class="main">第{{ props.round.round_id }}幕</span>
      <span class="sub">{{ timestampToDate(Number(props.round.finish_time) * 1000) }}</span>
    </div>
    <TucAeBox :avatars="props.round.avatars" :enemies="props.round.enemies" />
    <div class="tucr-content">
      <TucBuffBox
        :class="props.round.choice_cards.length === 0 ? 'fill' : ''"
        :model-value="props.round.splendour_buff"
      />
      <TucCardBox :model-value="props.round.choice_cards" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { timestampToDate } from "@utils/toolFunc.js";

import TucAeBox from "./tuc-ae-box.vue";
import TucBuffBox from "./tuc-buff-box.vue";
import TucCardBox from "./tuc-card-box.vue";

type TucRoundProps = { round: TGApp.Game.Combat.RoundData };
const props = defineProps<TucRoundProps>();

function getIcon(): string {
  return `${props.round.is_tarot ? "tarot" : "star"}_${props.round.is_get_medal ? "1" : "0"}`;
}
</script>
<style lang="scss" scoped>
.tucr-box {
  display: flex;
  width: 100%;
  height: fit-content;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 8px;
}

.tucr-title {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-right: auto;
  column-gap: 4px;

  img {
    height: 30px;
    object-fit: contain;

    &.stat_false {
      filter: invert(0.5);
    }
  }

  .main {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }

  .sub {
    opacity: 0.8;
  }
}

.tucr-content {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  align-items: stretch;
  justify-content: flex-start;
  column-gap: 8px;

  .fill {
    width: 100%;
  }
}
</style>
