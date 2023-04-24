<template>
  <TSwitchTheme />
  <div v-if="loading">
    <TLoading :empty="loadingEmpty" :title="loadingTitle" />
  </div>
  <div v-else>
    <div class="lottery-div">
      <div class="lottery-title">
        抽奖详情
        <span style="color:#E06C63">{{ timeStatus === "已开奖" ? timeStatus : `待开奖 ${timeStatus}` }}</span>
      </div>
      <div class="lottery-list">
        <v-list-item>
          <template #prepend>
            <v-avatar>
              <v-img :src="lotteryCard.creator.avatar_url" />
            </v-avatar>
          </template>
          {{ lotteryCard.creator.nickname }}
          <v-list-item-subtitle>{{ lotteryCard.creator.introduce }}</v-list-item-subtitle>
        </v-list-item>
        <div class="reward-title">
          参与方式：{{ participationMethod }}
        </div>
        <div class="reward-title">
          抽奖 ID：{{ lotteryCard.id }}
        </div>
        <div class="reward-title">
          奖品详情
          <div v-for="reward in lotteryCard.rewards" :key="reward.rewardName" class="reward-subtitle">
            {{ reward.rewardName }} {{ reward.scheduledWinnerNumber }}份
          </div>
        </div>
      </div>
      <v-btn class="lottery-back" @click="backPost()">
        <img src="../assets/icons/circle-cancel.svg" alt="back">
        <span>返回</span>
      </v-btn>
      <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="showJson = true">
        <template #prepend>
          <img src="../assets/icons/arrow-right.svg" alt="right">
        </template>
        JSON
      </v-btn>
    </div>
    <div v-show="showJson" class="lottery-json">
      <JsonViewer :value="jsonData" copyable boxed />
    </div>
    <div v-if="timeStatus === '已开奖'" class="lottery-div">
      <div class="lottery-title">
        中奖详情
      </div>
      <div v-for="reward in lotteryCard.rewards" :key="reward.rewardName" class="lottery-list">
        <div class="reward-title">
          {{ reward.rewardName }} {{ reward.scheduledWinnerNumber }}/{{ reward.winnerNumber }}
        </div>
        <div class="lottery-grid">
          <div v-for="user in reward.users" :key="user.uid" class="lottery-sub-list">
            <div class="lottery-user-avatar">
              <img :src="user.avatar_url" alt="avatar">
            </div>
            <div class="lottery-user-nickname">
              {{ user.nickname }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, reactive, onUpdated } from "vue";
import { useRoute } from "vue-router";
import JsonViewer from "vue-json-viewer";
import TLoading from "../components/t-loading.vue";
import TSwitchTheme from "../components/t-switchTheme.vue";
// tauri
import { appWindow } from "@tauri-apps/api/window";
// store
import { useAppStore } from "../store/modules/app";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { LotteryCard, LotteryData } from "../plugins/Mys/interface/lottery";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// store
const appStore = useAppStore();

// 定时器
const lotteryTimer = ref(null as any);
// 参与方式
const participationMethod = ref("未知" as string);

function flushTimeStatus () {
  const timeNow = new Date().getTime();
  const timeDiff = Number(jsonData.draw_time) * 1000 - timeNow;
  if (timeDiff <= 0) {
    timeStatus.value = "已开奖";
    clearInterval(lotteryTimer);
  } else {
    const day = Math.floor(timeDiff / (24 * 3600 * 1000));
    const hour = Math.floor((timeDiff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minute = Math.floor((timeDiff % (3600 * 1000)) / (60 * 1000));
    const second = Math.floor((timeDiff % (60 * 1000)) / 1000);
    timeStatus.value = `${day}天${hour}小时${minute}分${second}秒`;
  }
}

// 数据
const lotteryId = useRoute().params.lottery_id as string;
const lotteryCard = ref({} as LotteryCard);
const showJson = ref(false as boolean);
let jsonData = reactive({} as LotteryData);
const timeStatus = ref("未知" as string);

function backPost () {
  window.history.back();
}

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!lotteryId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  jsonData = await MysOper.Lottery.get(lotteryId);
  if (!jsonData) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    return;
  }
  await appWindow.setTitle("抽奖详情 " + jsonData.lottery_entity_summary);
  loadingTitle.value = "正在渲染数据...";
  lotteryCard.value = MysOper.Lottery.card.lottery(jsonData);
  if (jsonData.status === "Settled") {
    timeStatus.value = "已开奖";
  } else {
    lotteryTimer.value = setInterval(() => {
      flushTimeStatus();
    }, 1000);
  }
  participationMethod.value = getParticipationMethod(lotteryCard.value.participantWay);
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});

// 获取参与方式
function getParticipationMethod (participantWay: string) {
  switch (participantWay) {
    case "Forward":
      return "转发";
    default:
      return participantWay;
  }
}

// 监听 timeStatus
onUpdated(() => {
  if (timeStatus.value === "已开奖") {
    clearInterval(lotteryTimer);
  }
});

</script>
<style lang="css">
.lottery-div {
  background: var(--content-bg-2);
  border-radius: 10px;
  margin-bottom: 10px;
  padding: 10px;
}

.lottery-title {
  font-family: Genshin, serif;
  font-size: 20px;
  color: var(--content-text-3);
  margin-left: 40px;
}

.reward-title {
  font-family: Genshin-Light, serif;
  font-size: 16px;
  color: #faf7e8;
  margin: 10px;
}

.reward-subtitle {
  font-family: Genshin-Light, serif;
  font-size: 16px;
  color: #faf7e8;
  opacity: 0.5;
}

.lottery-list {
  background: var(--content-bg-1);
  border-radius: 10px;
  margin: 10px;
  padding: 10px;
  color: #faf7e8;
  font-family: Genshin-Light, serif;
}

.lottery-back {
  margin: 5px;
  height: 30px;
  border-radius: 40px;
  font-family: Genshin, serif;
  background: #4A5366;
}

.lottery-back img {
  position: absolute;
  left: 5px;
  width: 25px;
  height: 25px;
}

.lottery-back span {
  color: #faf7e8;
  font-size: 16px;
  margin-left: 10px;
}

.lottery-grid {
  border-radius: 10px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

.lottery-sub-list {
  background: var(--content-bg-2);
  border-radius: 40px;
  height: 40px;
  margin: 5px;
  font-family: Genshin-Light, serif;
  align-items: center;
  display: flex;
}

.lottery-user-avatar {
  display: inline-block;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  margin: 5px;
}

.lottery-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lottery-user-nickname {
  display: inline-block;
  font-size: 14px;
  font-family: Genshin-Light, "仿宋", serif;
  color: var(--content-text-3);
  overflow: hidden;
}

.lottery-json {
  padding: 20px;
  border-radius: 20px;
  font-family: Consolas, serif;
}

.jv-container {
  background: var(--content-bg-2) !important;
}
</style>
