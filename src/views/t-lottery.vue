<template>
  <div v-if="loading">
    <TLoading :empty="loadingEmpty" :title="loadingTitle" />
  </div>
  <div v-else>
    <div class="lottery-div">
      <div class="lottery-title">
        抽奖详情 {{ timeStatus }}
      </div>
      <v-list class="lottery-list">
        <v-list-item>
          <template #prepend>
            <v-avatar>
              <v-img :src="lotteryCard.creator.avatar_url" />
            </v-avatar>
          </template>
          {{ lotteryCard.creator.nickname }}
          <v-list-item-subtitle>{{ lotteryCard.creator.introduce }}</v-list-item-subtitle>
          <template #append>
            发起人
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>{{ lotteryCard.participantWay }}</v-list-item-title>
          <v-list-item-subtitle>{{ lotteryCard.id }}</v-list-item-subtitle>
          <template #append>
            抽奖 ID
          </template>
        </v-list-item>
      </v-list>
      <v-btn class="lottery-back" @click="backPost">
        返回
      </v-btn>
      <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="showJson = true">
        <template #prepend>
          <img src="../assets/icons/arrow-right.svg" alt="right">
        </template>
        JSON
      </v-btn>
    </div>
    <div v-show="showJson" class="dev-json">
      <JsonViewer :value="jsonData" copyable boxed />
    </div>
    <div class="lottery-div">
      <div class="lottery-title">
        奖品详情
      </div>
      <div v-for="reward in lotteryCard.rewards" :key="reward.rewardName">
        <v-list class="lottery-list">
          <v-list-item :title="reward.rewardName" :subtitle="'中奖人数' + reward.winnerNumber" />
        </v-list>
        <div class="lottery-grid">
          <v-list v-for="user in reward.users" :key="user.uid" class="lottery-sub-list">
            <v-list-item>
              <template #prepend>
                <v-avatar>
                  <v-img :src="user.avatar_url" />
                </v-avatar>
              </template>
              {{ user.nickname }}
            </v-list-item>
          </v-list>
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
  setTimeout(() => {
    loading.value = false;
  }, 200);
});

// 监听 timeStatus
onUpdated(() => {
  if (timeStatus.value === "已开奖") {
    clearInterval(lotteryTimer);
  }
});

</script>
<style lang="css">
.lottery-div {
  background: #faf7e8;
  border-radius: 10px;
  margin: 10px;
  padding: 10px;
}

.lottery-title {
  font-family: Genshin, serif;
  font-size: 20px;
  color: #546d8b;
  margin: 10px;
}

.lottery-list {
  background: #546d8b;
  border-radius: 10px;
  margin: 10px;
  color: #faf7e8;
  font-family: Genshin-Light, serif;
}

.lottery-sub-list {
  background: #faf7e8;
  border-radius: 10px;
  margin: 10px;
  color: #546d8b;
  font-family: Genshin-Light, serif;
}

.lottery-back {
  margin: 10px;
  font-family: Genshin, serif;
  color: #faf7e8 !important;
  background: #546d8b !important;
}

.lottery-grid {
  background: #546d8b;
  border-radius: 10px;
  margin: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-gap: 10px;
}
</style>
