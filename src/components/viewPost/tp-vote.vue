<template>
  <div class="tp-vote-box">
    <div class="tp-vote-info">
      <span>{{ votes?.title }}</span>
      <span>{{ votes?.count }}人已参与|{{ votes?.is_over ? "已截止" : "投票中" }}</span>
    </div>
    <div class="tp-vote-list">
      <div v-for="(item, index) in votes?.data" :key="index" class="tp-vote-item">
        <div class="tp-vote-item-title">
          <span>{{ item.title }}</span>
          <span>
            <span>{{ item.count }}票</span>
            <span>{{ item.percent.toFixed(2) }}%</span>
          </span>
        </div>
        <div class="tp-vote-progress">
          <div class="tp-vote-val" :style="{ width: item.percent + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import Mys from "../../plugins/Mys/index.js";

interface TpVote {
  insert: {
    vote: {
      id: string;
      uid: string;
    };
  };
}

interface TpVoteProps {
  data: TpVote;
}

interface TpVoteInfo {
  title: string;
  count: number;
  is_over: boolean;
  data: Array<{
    title: string;
    count: number;
    percent: number;
  }>;
}

const props = defineProps<TpVoteProps>();

const votes = ref<TpVoteInfo>();

onMounted(async () => {
  const vote = props.data.insert.vote;
  const voteInfo = await Mys.ApiHub.getVotes(vote.id, vote.uid);
  const voteResult = await Mys.ApiHub.getVoteResult(vote.id, vote.uid);
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
});
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
}

.tp-vote-item-title :first-child {
  font-size: 16px;
  font-weight: bold;
}

.tp-vote-item-title :last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tp-vote-item-title :last-child :first-child {
  font-size: 12px;
}

.tp-vote-item-title :last-child :last-child {
  font-size: 10px;
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
  background: linear-gradient(to right, #fb7299, #00aeec);
}
</style>
