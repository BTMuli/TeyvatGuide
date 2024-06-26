<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tpol-box" v-if="card">
      <div class="tpol-title">
        <span>抽奖详情</span>
        <span class="tpol-time">{{ timeStatus }}</span>
      </div>
      <div class="tpol-list">
        <v-list-item :title="card.creator.nickname" :subtitle="card.creator.introduce">
          <template #prepend>
            <v-avatar>
              <v-img :src="card.creator.avatar_url" />
            </v-avatar>
          </template>
        </v-list-item>
        <div class="tpolr-title">参与方式：{{ upWay }}</div>
        <div class="tpolr-title">
          <span>奖品详情</span>
          <div v-for="reward in card.rewards" :key="reward.name" class="reward-subtitle">
            {{ reward.name }} {{ reward.goal }}份
          </div>
        </div>
      </div>
      <div class="tpol-title" v-if="timeStatus === '已开奖'">中奖详情</div>
      <div v-if="timeStatus === '已开奖'">
        <div v-for="reward in card.rewards" :key="reward.name" class="tpol-list">
          <div class="tpolr-title">{{ reward.name }} {{ reward.win }}/{{ reward.goal }}</div>
          <div class="tpol-grid">
            <div v-for="user in reward.users" :key="user.uid" class="lottery-sub-list">
              <div class="tpol-avatar">
                <img :src="user.avatar_url" alt="avatar" />
              </div>
              <div class="tpol-nickname" :title="user.nickname">
                {{ user.nickname }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tpol-id">ID:{{ card.id }}</div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import Mys from "../../plugins/Mys/index.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface TpoLotteryProps {
  modelValue: boolean;
  lottery: string | undefined;
}

interface TpoLotteryEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "cancel"): void;
}

const props = defineProps<TpoLotteryProps>();
const emits = defineEmits<TpoLotteryEmits>();
const card = ref<TGApp.Plugins.Mys.Lottery.RenderCard>();
const jsonData = ref<TGApp.Plugins.Mys.Lottery.FullData>();
const timeStatus = ref<string>("未知");
const upWay = ref<string>("未知");

// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | undefined = undefined;

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

const onCancel = (): void => {
  visible.value = false;
  emits("cancel");
};

watch(
  () => props.lottery,
  async (value) => {
    if (!value) return;
    await load();
  },
  { immediate: true },
);

async function load(): Promise<void> {
  if (!props.lottery) return;
  if (card.value) return;
  const cardGet = await Mys.Lottery.get(props.lottery);
  if ("retcode" in cardGet) {
    showSnackbar({
      text: `[${cardGet.retcode}] ${cardGet.message}`,
      color: "error",
    });
    return;
  }
  jsonData.value = cardGet;
  if (cardGet.status === "Settled") {
    timeStatus.value = "已开奖";
  } else {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    timer = setInterval(() => {
      flushTimeStatus();
    }, 1000);
  }
  card.value = Mys.Lottery.card(cardGet);
  upWay.value = getUpWay(card.value?.upWay);
}

function getUpWay(upWay: string): string {
  switch (upWay) {
    case "Forward":
      return "转发";
    default:
      return upWay;
  }
}

function flushTimeStatus(): void {
  if (!jsonData.value) return;
  const timeNow = new Date().getTime();
  const timeDiff = Number(jsonData.value.draw_time) * 1000 - timeNow;
  if (timeDiff <= 0) {
    timeStatus.value = "已开奖";
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  } else {
    const day = Math.floor(timeDiff / (24 * 3600 * 1000));
    const hour = Math.floor((timeDiff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minute = Math.floor((timeDiff % (3600 * 1000)) / (60 * 1000));
    const second = Math.floor((timeDiff % (60 * 1000)) / 1000);
    timeStatus.value = `${day}天${hour}小时${minute}分${second}秒`;
  }
}
</script>
<style lang="css" scoped>
.tpol-box {
  display: flex;
  width: 800px;
  max-width: 800px;
  max-height: 50vh;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  overflow-y: auto;
  row-gap: 10px;
}

.tpol-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.tpol-time {
  margin-left: 10px;
  color: var(--tgc-red-1);
}

.tpol-list {
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
}

.tpolr-title {
  margin-bottom: 10px;
  margin-left: 5px;
  font-size: 16px;
}

.reward-subtitle {
  font-size: 16px;
  opacity: 0.5;
}

.tpol-grid {
  display: grid;
  border-radius: 10px;
  gap: 5px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.lottery-sub-list {
  display: flex;
  height: 40px;
  align-items: center;
  border-radius: 40px;
  background: var(--box-bg-3);
}

.tpol-avatar {
  display: inline-block;
  overflow: hidden;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin: 5px;
}

.tpol-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tpol-nickname {
  overflow: hidden;
  max-width: 120px;
  color: var(--box-text-4);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpol-id {
  font-size: 14px;
  text-align: right;
}
</style>
