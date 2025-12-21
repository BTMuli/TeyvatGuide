<!-- 投票组件 -->
<template>
  <div v-if="votes" class="tp-vote-box">
    <div class="tp-vote-info">
      <div class="tp-vote-title">
        {{ votes.title }}
      </div>
      <div class="tp-vote-overview">
        <span>{{ votes.count }}人已参与</span>
        <span>{{ votes.is_over ? "已截止" : `投票中 ${votes.endTime} 结束` }}</span>
      </div>
    </div>
    <div class="tp-vote-list">
      <div v-for="(item, index) in votes.data" :key="index" class="tp-vote-item">
        <!-- TODO: 投票  -->
        <div class="tp-vi-title">{{ item.title }}</div>
        <div class="tp-vi-stat">
          <span class="tp-vi-cnt">{{ item.count }}票</span>
          <span class="tp-vi-percent">{{ item.percent.toFixed(2) }}%</span>
        </div>
        <div class="tp-vi-progress">
          <div :style="getWidth(item)" class="tp-vote-val" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import ApiHubReq from "@req/apiHubReq.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef } from "vue";

/** 投票组件数据类型 */
type TpVote = {
  /** 插入数据 */
  insert: {
    /** 投票数据 */
    vote: {
      /** 投票ID */
      id: string;
      /** 投票发布者UID */
      uid: string;
    };
  };
};
type TpVoteProps = { data: TpVote };
/** 投票选项数据 */
type TpVoteData = {
  /** 标题 */
  title: string;
  /** 票数 */
  count: number;
  /** 百分比 */
  percent: number;
};
/** 投票信息 */
type TpVoteInfo = {
  /** 标题 */
  title: string;
  /** 参与人数 */
  count: number;
  /** 是否结束 */
  is_over: boolean;
  /** 选项数据 */
  data: Array<TpVoteData>;
  /** 结束时间 */
  endTime: string;
};

const props = defineProps<TpVoteProps>();
const votes = shallowRef<TpVoteInfo>();
const maxCnt = ref<number>(0);

console.log("tp-vote:", props.data);

onMounted(async () => {
  const vote = props.data.insert.vote;
  const voteInfo = await ApiHubReq.vote.info(vote.id, vote.uid);
  console.log(`[${props.data.insert.vote.id}]voteInfo:`, voteInfo);
  const voteResult = await ApiHubReq.vote.result(vote.id, vote.uid);
  console.log("[${props.data.insert.vote.id}]voteResult:", voteResult);
  votes.value = {
    title: voteInfo.title,
    count: voteResult.user_cnt,
    is_over: voteResult.is_over,
    data: voteInfo.vote_option_indexes.map((item, index) => ({
      title: item,
      count: voteResult.option_stats[index] ?? 0,
      percent: ((voteResult.option_stats[index] ?? 0) / voteResult.user_cnt) * 100,
    })),
    endTime: timestampToDate(voteInfo.end_time * 1000),
  };
  maxCnt.value = Math.max(...votes.value.data.map((item) => item.count));
});

function getWidth(item: TpVoteData): string {
  if (maxCnt.value === 0) return "width: 0%;";
  return `width: ${(item.count / maxCnt.value) * 100}%;`;
}
</script>
<style lang="scss" scoped>
.tp-vote-box {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin: 8px 0;
  background: var(--box-bg-1);
  row-gap: 8px;
}

.tp-vote-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tp-vote-title {
  font-family: var(--font-title);
  font-size: 20px;
}

.tp-vote-overview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
  font-size: 12px;
  font-style: italic;
}

.tp-vote-list {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.tp-vote-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tp-vi-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  column-gap: 4px;
  font-size: 16px;
  font-weight: bold;
}

.tp-vi-stat {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
  font-size: 12px;
}

.tp-vi-progress {
  overflow: hidden;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--common-shadow-1);
}

.tp-vote-val {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(to right, #66ccff 0, #f09199 360px);
}
</style>
