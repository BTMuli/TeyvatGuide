<template>
  <TOverlay v-model="visible">
    <div class="tpol-box" v-if="card">
      <div class="tpol-title">
        <span>抽奖详情</span>
        <span>{{ timeStatus }}</span>
      </div>
      <div class="tpol-info">
        <TpAvatar :data="card.creator" position="left" />
        <div>参与方式：{{ upWay }}</div>
        <div>奖品详情：</div>
        <div v-for="reward in card.rewards" :key="reward.name" class="tpol-info-reward">
          <v-icon size="12" color="var(--tgc-pink-1)">mdi-gift</v-icon>
          <span>{{ reward.name }}</span>
          <span>{{ reward.goal }}份</span>
        </div>
      </div>
      <div class="tpol-title" v-if="timeStatus === '已开奖'">中奖详情</div>
      <template v-if="timeStatus === '已开奖'">
        <template v-for="reward in card.rewards" :key="reward.name">
          <div class="vpol-reward-title">{{ reward.name }} {{ reward.win }}/{{ reward.goal }}</div>
          <div class="vpol-reward-users">
            <TpAvatar
              v-for="user in reward.users"
              :key="user.uid"
              :data="user"
              position="left"
              class="tpolr-user"
              @click="onUserClick(user)"
            />
          </div>
        </template>
      </template>
      <div class="tpol-id" @click="shareLottery()">ID:{{ card.id }}</div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import painterReq from "@req/painterReq.js";
import { emit } from "@tauri-apps/api/event";
import { generateShareImg } from "@utils/TGShare.js";
import { stamp2LastTime } from "@utils/toolFunc.js";
import { onUnmounted, ref, shallowRef, watch } from "vue";

type TpoLotteryProps = { lottery: string | undefined };
type RenderCard = {
  id: string;
  upWay: string;
  status: string;
  creator: TGApp.BBS.Post.User;
  drawTime: string;
  rewards: Array<RenderReward>;
};
type RenderReward = {
  name: string;
  win: number;
  goal: number;
  users: Array<TGApp.BBS.Post.User>;
};

const props = defineProps<TpoLotteryProps>();
const visible = defineModel<boolean>();
const timeStatus = ref<string>("未知");
const upWay = ref<string>("未知");
const card = shallowRef<RenderCard>();
const jsonData = shallowRef<TGApp.BBS.Lottery.FullData>();

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | undefined = undefined;

watch(
  () => props.lottery,
  async (v) => (v ? await load() : undefined),
  { immediate: true },
);

async function load(): Promise<void> {
  if (!props.lottery) return;
  if (card.value) return;
  const resp = await painterReq.lottery(props.lottery);
  if ("retcode" in resp) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  jsonData.value = resp;
  if (resp.status === "Settled") timeStatus.value = "已开奖";
  else {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    timer = setInterval(flushTimeStatus, 1000);
  }
  card.value = transLotteryCard(resp);
  upWay.value = getUpWay(card.value?.upWay);
}

function getUpWay(upWay: string): string {
  switch (upWay) {
    case "Forward":
      return "转发";
    case "Reply":
      return "回复";
    default:
      return upWay;
  }
}

function flushTimeStatus(): void {
  if (!jsonData.value) return;
  const timeNow = new Date().getTime();
  const timeDiff = Number(jsonData.value.draw_time) * 1000 - timeNow;
  if (timeDiff > 0) timeStatus.value = stamp2LastTime(timeDiff);
  else {
    timeStatus.value = "已开奖";
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }
}

function transLotteryReward(lotteryReward: TGApp.BBS.Lottery.Reward): RenderReward {
  return {
    name: lotteryReward.reward_name,
    win: lotteryReward.winner_number,
    goal: lotteryReward.scheduled_winner_number,
    users: lotteryReward.users,
  };
}

function transLotteryCard(lotteryData: TGApp.BBS.Lottery.FullData): RenderCard {
  return {
    id: lotteryData.id,
    upWay: lotteryData.participant_way,
    status: lotteryData.status,
    creator: lotteryData.creator,
    drawTime: lotteryData.draw_time,
    rewards: lotteryData.user_rewards.map(transLotteryReward),
  };
}

async function onUserClick(user: TGApp.BBS.Post.User): Promise<void> {
  const uid = user.uid;
  await emit("userMention", uid);
}

async function shareLottery(): Promise<void> {
  const shareDom = document.querySelector<HTMLDivElement>(".tpol-box");
  if (!shareDom) return;
  const fileName = `lottery-${card.value?.id}.png`;
  await generateShareImg(fileName, shareDom, 2, true);
}

onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
});
</script>
<style lang="css" scoped>
.tpol-box {
  position: relative;
  display: flex;
  width: 800px;
  max-width: 800px;
  max-height: 50vh;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 2px;
  background: var(--box-bg-1);
  overflow-y: auto;
  row-gap: 4px;
}

.tpol-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;

  :last-child {
    color: var(--tgc-red-1);
    font-size: 18px;
  }
}

.tpol-info {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
}

.tpol-info-reward {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: 16px;
  color: var(--tgc-od-white);
  column-gap: 4px;
  font-size: 12px;

  :last-child {
    font-style: italic;
    text-decoration: underline;
  }
}

.vpol-reward-title {
  position: relative;
  width: 100%;
  color: var(--box-text-2);
  text-align: center;
}

.vpol-reward-users {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tpolr-user {
  position: relative;
  width: fit-content;
  height: 50px;
  box-sizing: border-box;
  padding-right: 20px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 50px;
  background: var(--box-bg-2);
  cursor: pointer;
}

.tpol-id {
  position: absolute;
  top: 4px;
  right: 4px;
  cursor: pointer;
  font-size: 12px;
}
</style>
