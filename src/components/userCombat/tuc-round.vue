<!-- 剧诗单幕 -->
<template>
  <div ref="tucrEl" class="tucr-box">
    <div class="tucr-title" @click="shareRound()">
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
    <span v-if="showInfo" class="tucr-info">UID {{ props.uid }} | 第{{ props.id }}期</span>
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
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { nextTick, ref, useTemplateRef } from "vue";

import TucAeBox from "./tuc-ae-box.vue";
import TucBuffBox from "./tuc-buff-box.vue";
import TucCardBox from "./tuc-card-box.vue";

type TucRoundProps = { round: TGApp.Game.Combat.RoundData; uid: string; id: number };
const props = defineProps<TucRoundProps>();
const showInfo = ref<boolean>(false);
const tucrRef = useTemplateRef<HTMLDivElement>("tucrEl");

function getIcon(): string {
  return `${props.round.is_tarot ? "tarot" : "star"}_${props.round.is_get_medal ? "1" : "0"}`;
}

async function shareRound(): Promise<void> {
  if (!tucrRef.value) {
    showSnackbar.warn("未捕获到分享Dom");
    return;
  }
  showInfo.value = true;
  await nextTick();
  const fileName = `真境剧诗_第${props.round.round_id}幕`;
  await generateShareImg(fileName, tucrRef.value);
  showInfo.value = false;
}
</script>
<style lang="scss" scoped>
.tucr-box {
  position: relative;
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
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-right: auto;
  column-gap: 4px;
  cursor: pointer;

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

.tucr-info {
  position: absolute;
  z-index: -1;
  top: 24px;
  right: 8px;
  font-size: 12px;
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
