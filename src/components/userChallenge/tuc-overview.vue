<!-- 幽境危战，单人/联机数据总览 -->
<template>
  <div class="tuc-overview-comp">
    <div class="toc-top-title">
      <div class="title">{{ props.title }}{{ props.data.has_data ? "" : " (无数据) " }}</div>
      <div class="append" v-if="props.data.best">
        <span>最佳记录</span>
        <span>{{ props.data.best.second }}s</span>
        <img
          :title="getHardChallengeDesc(props.data.best.difficulty)"
          :src="`/icon/challenge/UI_LeyLineChallenge_Medal_${props.data.best.difficulty}.webp`"
          alt="medal"
        />
      </div>
    </div>
    <TucChallengeItem
      v-for="(challenge, idx) in props.data.challenge"
      :key="idx"
      :data="challenge"
    />
  </div>
</template>
<script lang="ts" setup>
import { getHardChallengeDesc } from "@Sql/utils/transUserRecord.js";

import TucChallengeItem from "./tuc-challenge-item.vue";

type TucOverviewProps = { title: string; data: TGApp.Game.Challenge.Challenge };

const props = defineProps<TucOverviewProps>();
</script>
<style lang="scss" scoped>
.tuc-overview-comp {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 12px;
}

.toc-top-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-1);

  .title {
    font-family: var(--font-title);
    font-size: 18px;
  }

  .append {
    display: flex;
    align-items: center;
    color: var(--box-text-2);
    gap: 4px;

    span {
      font-size: 14px;

      &:nth-child(2) {
        color: var(--tgc-yellow-1);
        font-family: var(--font-title);
        font-size: 16px;
      }
    }

    img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
  }
}
</style>
