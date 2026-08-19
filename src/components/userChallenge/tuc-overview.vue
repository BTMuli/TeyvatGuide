<!-- 幽境危战，单人/联机数据总览 -->
<template>
  <div class="tuc-overview-comp">
    <div class="toc-top-title">
      <div class="title">{{ props.title }}{{ props.data.has_data ? "" : " (无数据) " }}</div>
      <div v-if="props.data.best" class="append">
        <span>最佳记录</span>
        <img
          :src="`/icon/challenge/UI_LeyLineChallenge_Medal_${props.data.best.difficulty}.webp`"
          :title="gameEnum.challenge.diffDesc(props.data.best.difficulty)"
          alt="medal"
        />
        <span>{{ props.data.best.second }}s</span>
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
import gameEnum from "@enum/game.js";

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

    span {
      font-size: 14px;

      &:last-child {
        color: var(--tgc-yellow-1);
        font-family: var(--font-title);
        font-size: 16px;
        font-weight: normal;
      }
    }

    img {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }
  }
}
</style>
