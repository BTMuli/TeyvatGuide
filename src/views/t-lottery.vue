<template>
  <TSwitchTheme />
  <TOLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
  <div v-if="!loading" class="lottery-box">
    <div class="lottery-title">
      抽奖详情
      <span style="color: #e06c63">{{
        timeStatus === "已开奖" ? timeStatus : `待开奖 ${timeStatus}`
      }}</span>
    </div>
    <div class="lottery-list">
      <v-list-item>
        <template #prepend>
          <v-avatar>
            <v-img :src="lotteryCard.creator.avatar_url" />
          </v-avatar>
        </template>
        <template #append>
          <v-btn variant="outlined" @click="backPost()"> 返回 </v-btn>
        </template>
        {{ lotteryCard.creator.nickname }}
        <v-list-item-subtitle>{{ lotteryCard.creator.introduce }}</v-list-item-subtitle>
      </v-list-item>
      <div class="reward-title">参与方式：{{ participationMethod }}</div>
      <div class="reward-title">抽奖 ID：{{ lotteryCard.id }}</div>
      <div class="reward-title">
        奖品详情
        <div v-for="reward in lotteryCard.rewards" :key="reward.rewardName" class="reward-subtitle">
          {{ reward.rewardName }} {{ reward.scheduledWinnerNumber }}份
        </div>
      </div>
    </div>
  </div>
  <div v-if="timeStatus === '已开奖'" class="lottery-box">
    <div class="lottery-title">中奖详情</div>
    <div v-for="reward in lotteryCard.rewards" :key="reward.rewardName" class="lottery-list">
      <div class="reward-title">
        {{ reward.rewardName }} {{ reward.scheduledWinnerNumber }}/{{ reward.winnerNumber }}
      </div>
      <div class="lottery-grid">
        <div v-for="user in reward.users" :key="user.uid" class="lottery-sub-list">
          <div class="lottery-user-avatar">
            <img :src="user.avatar_url" alt="avatar" />
          </div>
          <div class="lottery-user-nickname">
            {{ user.nickname }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showJson" class="lottery-json">
    <JsonViewer :value="jsonData" copyable boxed />
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, onUpdated, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import JsonViewer from "vue-json-viewer";
import TOLoading from "../components/overlay/to-loading.vue";
import TSwitchTheme from "../components/main/t-switchTheme.vue";
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
const showJson = computed(() => appStore.devMode);
// 定时器
const lotteryTimer = ref(null as any);
// 参与方式
const participationMethod = ref("未知" as string);

function flushTimeStatus() {
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
let jsonData = reactive({} as LotteryData);
const timeStatus = ref("未知" as string);

function backPost() {
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
function getParticipationMethod(participantWay: string) {
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
.lottery-box {
  padding: 10px;
  border-radius: 25px 5px 5px;
  margin-bottom: 10px;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
}

.lottery-title {
  height: 40px;
  margin-left: 40px;
  color: var(--content-text-3);
  font-family: Genshin, serif;
  font-size: 20px;
}

.lottery-list {
  padding: 5px;
  border-radius: 5px;
  margin-bottom: 10px;
  background: rgb(0 0 0 / 40%);
  box-shadow: 0 0 10px rgb(255 255 255 / 10%);
  color: #faf7e8;
  font-family: Genshin-Light, serif;
}

.reward-title {
  margin: 10px;
  font-size: 16px;
}

.reward-subtitle {
  font-size: 16px;
  opacity: 0.5;
}

.lottery-grid {
  display: grid;
  border-radius: 10px;
  grid-template-columns: repeat(5, 1fr);
}

.lottery-sub-list {
  display: flex;
  height: 40px;
  align-items: center;
  border-radius: 40px;
  margin: 5px;
  background: var(--content-bg-2);
  font-family: Genshin-Light, serif;
}

.lottery-user-avatar {
  display: inline-block;
  overflow: hidden;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin: 5px;
}

.lottery-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lottery-user-nickname {
  display: inline-block;
  overflow: hidden;
  color: var(--content-text-3);
  font-family: Genshin-Light, "仿宋", serif;
  font-size: 14px;
}

.lottery-json {
  border-radius: 25px 5px;
  margin-bottom: 10px;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
  color: #faf7e8;
  font-family: Consolas, serif;
}

.jv-container {
  border-radius: 25px 5px !important;
  background: rgb(0 0 0 / 60%) !important;
  box-shadow: 0 0 10px rgb(0 0 0 / 40%) !important;
}

.jv-key,
.jv-array {
  color: #f0c674 !important;
}
</style>
