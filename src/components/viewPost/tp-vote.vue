<template>
  <div class="tp-vote-box">
    <div class="tp-vote-info">
      <span>{{ votes?.title }}</span>
      <span>{{ votes?.count }}人已参与|{{ votes?.is_over ? "已截止" : "投票中" }}</span>
    </div>
    <div class="tp-vote-list">
      <div v-for="(item, index) in votes?.data" :key="index" class="tp-vote-item">
        <div class="tp-vote-item-title">
          <span class="title">{{ item.title }}</span>
          <span class="val">
            <span>{{ item.count }}票</span>
            <span>{{ item.percent.toFixed(2) }}%</span>
          </span>
        </div>
        <div class="tp-vote-progress">
          <div class="tp-vote-val" :style="getWidth(item)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import ApiHubReq from "@req/apiHubReq.js";
import { onMounted, ref, shallowRef } from "vue";

type TpVote = { insert: { vote: { id: string; uid: string } } };
type TpVoteProps = { data: TpVote };
type TpVoteData = { title: string; count: number; percent: number };
type TpVoteInfo = { title: string; count: number; is_over: boolean; data: Array<TpVoteData> };

const props = defineProps<TpVoteProps>();
const votes = shallowRef<TpVoteInfo>();
const maxCnt = ref<number>(0);

onMounted(async () => {
  const vote = props.data.insert.vote;
  const voteInfo = await ApiHubReq.vote.info(vote.id, vote.uid);
  const voteResult = await ApiHubReq.vote.result(vote.id, vote.uid);
  votes.value = {
    title: voteInfo.title,
    count: voteResult.user_cnt,
    is_over: voteResult.is_over,
    data: voteInfo.vote_option_indexes.map((item, index) => ({
      title: item,
      count: voteResult.option_stats[index] ?? 0,
      percent: ((voteResult.option_stats[index] ?? 0) / voteResult.user_cnt) * 100,
    })),
  };
  maxCnt.value = Math.max(...votes.value.data.map((item) => item.count));
});

function getWidth(item: TpVoteData): string {
  if (maxCnt.value === 0) return "width: 0%;";
  return `width: ${(item.count / maxCnt.value) * 100}%;`;
}
</script>
<style lang="css" scoped>
.tp-vote-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  row-gap: 10px;
}

.tp-vote-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tp-vote-info :first-child {
  font-size: 20px;
  font-weight: bold;
}

.tp-vote-list {
  display: grid;
  gap: 10px 20px;
  grid-template-columns: repeat(2, 1fr);
}

.tp-vote-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tp-vote-item-title {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    font-size: 16px;
    font-weight: bold;
  }

  .val {
    display: flex;
    flex-direction: column;
    gap: 5px;
    white-space: nowrap;

    :first-child {
      font-size: 12px;
    }

    :last-child {
      font-size: 10px;
    }
  }
}

.tp-vote-progress {
  overflow: hidden;
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background: var(--common-shadow-1);
}

.tp-vote-val {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(to right, #66ccff 0, #f09199 360px);
}
</style>
