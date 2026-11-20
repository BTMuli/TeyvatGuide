<!-- 米游社帖子-抽奖详情浮窗 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    :shareCaption
    :titleId
    closeAriaLabel="关闭抽奖详情"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="800px"
    shareAriaLabel="保存抽奖详情分享图"
    @share="shareLottery"
  >
    <template #header>
      <div class="vpol-heading">
        <h2 :id="titleId" class="vpol-title">抽奖详情</h2>
        <span v-if="timeStatus" class="vpol-time">{{ timeStatus }}</span>
      </div>
    </template>

    <template v-if="card">
      <div class="vpol-summary">
        <TpAvatar :data="card.creator" position="left" @click="toUserProfile(card.creator.uid)" />
        <div class="vpol-meta">参与方式：{{ upWay }}</div>
        <div class="vpol-meta">奖品详情：</div>
        <div class="vpol-rewards">
          <div v-for="reward in card.rewards" :key="reward.name" class="vpol-reward">
            <v-icon aria-hidden="true" color="var(--tgc-pink-1)" size="14">mdi-gift</v-icon>
            <span>{{ reward.name }}</span>
            <span class="vpol-reward-count">{{ reward.goal }}份</span>
          </div>
        </div>
      </div>

      <section v-if="isSettled" class="vpol-winners">
        <h3 class="vpol-section-title">中奖详情</h3>
        <div v-for="reward in card.rewards" :key="reward.name" class="vpol-winner-group">
          <div class="vpol-winner-title">{{ reward.name }} {{ reward.win }}/{{ reward.goal }}</div>
          <div class="vpol-winner-list">
            <TpAvatar
              v-for="user in reward.users"
              :key="user.uid"
              :data="user"
              class="vpol-winner"
              position="left"
              @click="onUserClick(user)"
            />
          </div>
        </div>
      </section>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TpAvatar from "@comp/viewPost/tp-avatar.vue";
import painterReq from "@req/painterReq.js";
import { emit } from "@tauri-apps/api/event";
import { openCommunityProfile } from "@utils/community/profile.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import { generateShareImg } from "@utils/share/TGShare.js";
import TGLogger from "@utils/system/TGLogger.js";
import { computed, onUnmounted, ref, shallowRef, useId, useTemplateRef, watch } from "vue";

type TpoLotteryProps = { lottery: string | undefined };
type RenderCard = {
  id: string;
  upWay: string;
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

const { lottery } = defineProps<TpoLotteryProps>();
const visible = defineModel<boolean>();
const titleId = useId();
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const timeStatus = ref<string>("");
const card = shallowRef<RenderCard>();
let timer: ReturnType<typeof setInterval> | undefined = undefined;
let active = true;

const isSettled = computed<boolean>(() => timeStatus.value === "已开奖");
const upWay = computed<string>(() => (card.value ? getUpWay(card.value.upWay) : ""));
const shareCaption = computed<string>(() =>
  card.value ? `抽奖详情 · ID:${card.value.id}` : "抽奖详情",
);
const shareName = computed<string>(() => (card.value ? `抽奖详情_${card.value.id}` : "抽奖详情"));

watch(
  () => lottery,
  async (value) => {
    if (value) await load();
  },
  { immediate: true },
);

async function load(): Promise<void> {
  if (!lottery) return;
  if (card.value) return;
  let resp: TGApp.BBS.Lottery.Resp | undefined;
  try {
    resp = await painterReq.lottery(lottery);
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      await TGLogger.Warn(`[VpOverlayLottery][load] 获取抽奖数据异常`);
      await TGLogger.Warn(`[VpOverlayLottery][load] [${resp.retcode}] ${resp.message}`);
      return;
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取抽奖数据异常: ${errMsg}`);
    await TGLogger.Error(`[VpOverlayLottery][load] 获取抽奖数据异常`);
    await TGLogger.Error(`[VpOverlayLottery][load] ${e}`);
    return;
  }
  if (!resp || !active) return;
  card.value = transLotteryCard(resp.data.show_lottery);
  if (resp.data.show_lottery.status === "Settled") {
    timeStatus.value = "已开奖";
    return;
  }
  startTimer();
}

function getUpWay(way: string): string {
  switch (way) {
    case "Forward":
      return "转发";
    case "Reply":
      return "回复";
    default:
      return way;
  }
}

function startTimer(): void {
  stopTimer();
  flushTimeStatus();
  if (isSettled.value) return;
  timer = setInterval(flushTimeStatus, 1000);
}

function stopTimer(): void {
  if (timer === undefined) return;
  clearInterval(timer);
  timer = undefined;
}

function flushTimeStatus(): void {
  if (!card.value) return;
  const timeDiff = Number(card.value.drawTime) * 1000 - Date.now();
  if (timeDiff > 0) {
    timeStatus.value = fmtUtil.remainingTime(timeDiff);
    return;
  }
  timeStatus.value = "已开奖";
  stopTimer();
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
  if (!card.value) {
    showSnackbar.warn("抽奖详情尚未加载");
    return;
  }
  const panel = overlayPanel.value?.panel ?? null;
  const content = overlayPanel.value?.content ?? null;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  await showLoading.start("正在生成分享图", shareName.value);
  const panelMaxHeight = panel.style.maxHeight;
  const panelOverflow = panel.style.overflow;
  const contentOverflowY = content.style.overflowY;
  panel.style.maxHeight = "none";
  panel.style.overflow = "visible";
  content.style.overflowY = "visible";
  try {
    await generateShareImg(shareName.value, panel, 1.5, true);
  } finally {
    panel.style.maxHeight = panelMaxHeight;
    panel.style.overflow = panelOverflow;
    content.style.overflowY = contentOverflowY;
    await showLoading.end();
  }
}

async function toUserProfile(uid: string): Promise<void> {
  await openCommunityProfile(uid);
}

onUnmounted(() => {
  active = false;
  stopTimer();
});
</script>
<style lang="scss" scoped>
.vpol-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.vpol-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  line-height: 28px;
  white-space: nowrap;
}

.vpol-time {
  color: var(--tgc-red-1);
  font-family: var(--font-title);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  font-weight: normal;
  line-height: 24px;
  white-space: nowrap;
}

.vpol-summary,
.vpol-winners {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.vpol-summary {
  align-items: flex-start;
  color: var(--box-text-1);
}

.vpol-meta {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
}

.vpol-rewards {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding-left: 8px;
  gap: 4px;
}

.vpol-reward {
  display: flex;
  align-items: center;
  color: var(--box-text-1);
  font-size: 14px;
  gap: 4px;
  line-height: 20px;
}

.vpol-reward-count {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.vpol-section-title {
  margin: 0;
  color: var(--common-text-title);
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}

.vpol-winner-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vpol-winner-title {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
}

.vpol-winner-list {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.vpol-winner {
  height: 52px;
  box-sizing: border-box;
  padding-right: 20px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
}

.vpol-winner:hover {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-3);
}
</style>
