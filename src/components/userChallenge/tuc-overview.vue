<!-- 幽境危战，单人/联机数据总览 -->
<template>
  <div class="tuc-overview-comp" @click="onClick()">
    <TSubline>{{ props.title }}{{ props.data.has_data ? "" : " (无数据) " }}</TSubline>
    <div class="toc-best" v-if="props.data.best">
      <div class="label">
        <span>最佳记录</span>
      </div>
      <div class="append" :title="getDiffTitle(props.data.best)">
        <span>{{ getDiffTitle(props.data.best) }}</span>
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
import TSubline from "@comp/app/t-subline.vue";
import TucChallengeItem from "@comp/userChallenge/tuc-challenge-item.vue";

type TucOverviewProps = {
  title: string;
  data: TGApp.Game.Challenge.Challenge;
};

const props = defineProps<TucOverviewProps>();

function onClick(): void {
  console.log(props.data);
}

function getDiffTitle(best: TGApp.Game.Challenge.ChallengeBest): string {
  switch (best.difficulty) {
    case 1:
      return "普通";
    case 2:
      return "进阶";
    case 3:
      return "困难";
    case 4:
      return "险恶";
    case 5:
      return "无畏";
    case 6:
      return "绝境";
    default:
      return `难度${best.difficulty}`;
  }
}
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

.toc-best {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-1);

  .label {
    font-family: var(--font-title);
  }

  .append {
    display: flex;
    align-items: center;
    color: var(--box-text-2);
    gap: 4px;
  }
}
</style>
