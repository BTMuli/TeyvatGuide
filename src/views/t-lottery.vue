<!-- todo 做成 overlay -->
<template>
  <TSwitchTheme />
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" />
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
          <v-btn variant="outlined" @click="backPost()"> 返回</v-btn>
        </template>
        {{ lotteryCard.creator.nickname }}
        <v-list-item-subtitle>{{ lotteryCard.creator.introduce }}</v-list-item-subtitle>
      </v-list-item>
      <div class="reward-title">参与方式：{{ participationMethod }}</div>
      <div class="reward-title">抽奖 ID：{{ lotteryCard.id }}</div>
      <div class="reward-title">
        奖品详情
        <div v-for="reward in lotteryCard.rewards" :key="reward.name" class="reward-subtitle">
          {{ reward.name }} {{ reward.goal }}份
        </div>
      </div>
    </div>
    <div v-if="timeStatus === '已开奖'">
      <div class="lottery-title">中奖详情</div>
      <div v-for="reward in lotteryCard.rewards" :key="reward.name" class="lottery-list">
        <div class="reward-title">{{ reward.name }} {{ reward.win }}/{{ reward.goal }}</div>
        <div class="lottery-grid">
          <div v-for="user in reward.users" :key="user.uid" class="lottery-sub-list">
            <div class="lottery-user-avatar">
              <img :src="user.avatar_url" alt="avatar" />
            </div>
            <div class="lottery-user-nickname" :title="user.nickname">
              {{ user.nickname }}
            </div>
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
import { appWindow } from "@tauri-apps/api/window";
import { computed, onMounted, onUpdated, reactive, ref } from "vue";
import JsonViewer from "vue-json-viewer";
import { useRoute } from "vue-router";

import TSwitchTheme from "../components/app/t-switchTheme.vue";
import ToLoading from "../components/overlay/to-loading.vue";
import Mys from "../plugins/Mys";
import { useAppStore } from "../store/modules/app";
import TGLogger from "../utils/TGLogger";

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
const loadingEmpty = ref<boolean>(false);

// store
const appStore = useAppStore();
const showJson = computed(() => appStore.devMode);
// 定时器
const lotteryTimer = ref<any>(null);
// 参与方式
const participationMethod = ref<string>("未知");

function flushTimeStatus(): void {
  const timeNow = new Date().getTime();
  const timeDiff = Number(jsonData.draw_time) * 1000 - timeNow;
  if (timeDiff <= 0) {
    timeStatus.value = "已开奖";
    clearInterval(lotteryTimer.value);
  } else {
    const day = Math.floor(timeDiff / (24 * 3600 * 1000));
    const hour = Math.floor((timeDiff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minute = Math.floor((timeDiff % (3600 * 1000)) / (60 * 1000));
    const second = Math.floor((timeDiff % (60 * 1000)) / 1000);
    timeStatus.value = `${day}天${hour}小时${minute}分${second}秒`;
  }
}

// 数据
const lotteryId = <string>useRoute().params.lottery_id;
const lotteryCard = ref<TGApp.Plugins.Mys.Lottery.RenderCard>(
  <TGApp.Plugins.Mys.Lottery.RenderCard>{},
);
let jsonData = reactive<TGApp.Plugins.Mys.Lottery.FullData>(<TGApp.Plugins.Mys.Lottery.FullData>{});
const timeStatus = ref<string>("未知");

function backPost(): void {
  window.history.back();
}

onMounted(async () => {
  await appWindow.show();
  // 检查数据
  if (!lotteryId) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await TGLogger.Error("[t-lottery.vue] 未找到 lottery_id");
    return;
  }
  // 获取数据
  loadingTitle.value = "正在获取数据...";
  jsonData = await Mys.Lottery.get(lotteryId);
  if (!jsonData) {
    loadingEmpty.value = true;
    loadingTitle.value = "未找到数据";
    await TGLogger.Error("[t-lottery.vue] 未找到数据");
    return;
  }
  await appWindow.setTitle("抽奖详情 " + jsonData.lottery_entity_summary);
  loadingTitle.value = "正在渲染数据...";
  lotteryCard.value = Mys.Lottery.card(jsonData);
  if (jsonData.status === "Settled") {
    timeStatus.value = "已开奖";
  } else {
    lotteryTimer.value = setInterval(() => {
      flushTimeStatus();
    }, 1000);
  }
  participationMethod.value = getUpWay(lotteryCard.value.upWay);
  setTimeout(() => {
    loading.value = false;
  }, 1000);
});

// 获取参与方式
function getUpWay(upWay: string): string {
  switch (upWay) {
    case "Forward":
      return "转发";
    default:
      return upWay;
  }
}

// 监听 timeStatus
onUpdated(() => {
  if (timeStatus.value === "已开奖") {
    clearInterval(lotteryTimer.value);
  }
});
</script>
<style lang="css">
.lottery-box {
  padding: 10px;
  border-radius: 20px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
}

.lottery-title {
  height: 40px;
  margin-left: 40px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.lottery-list {
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-bottom: 10px;
  background: var(--box-bg-2);
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
  background: var(--box-bg-3);
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
  overflow: hidden;
  max-width: 120px;
  color: var(--box-text-4);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lottery-json {
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  background: var(--box-bg-1);
}

.jv-container {
  border-radius: 10px;
  background: var(--box-bg-2) !important;
}

.jv-key,
.jv-array {
  color: var(--box-text-4) !important;
}
</style>
