<template>
  <v-list class="position-card">
    <v-list-item>
      <v-list-item-title style="color: #fec90b; margin-left: 10px; font-family: Genshin, serif">
        <img src="../assets/icons/board.svg" alt="act" class="position-act-icon">
        近期活动
      </v-list-item-title>
      <div v-if="!loading" class="position-grid">
        <v-card
          v-for="card in positionCards"
          :key="card.post_id"
          style="background: var(--content-bg-2); color: #546d8b; border-radius: 10px"
        >
          <v-list style="background: var(--content-bg-2); color: #546d8b">
            <v-list-item :title="card.title" :subtitle="card.abstract">
              <template #prepend>
                <v-avatar rounded="0" style="cursor: pointer" @click="toPost(card)">
                  <v-img :src="card.icon" style="border-radius: 10px" />
                </v-avatar>
              </template>
            </v-list-item>
          </v-list>
          <v-divider class="border-opacity-75" />
          <v-card-text>
            <span style="width: 60%">
              <v-icon>mdi-calendar-clock</v-icon>
              {{ card.time.start }}~{{ card.time.end }}
            </span>
          </v-card-text>
          <v-card-actions>
            <span style="width: 80%; margin-left: 10px">
              <v-icon>mdi-clock-outline</v-icon>
              剩余时间：
              <span v-if="positionTimeGet[card.post_id] !== '已结束'" style="color: #90caf9">{{
                positionTimeGet[card.post_id]
              }}</span>
              <span v-if="positionTimeGet[card.post_id] === '已结束'" style="color: #ff6d6d">已结束</span>
            </span>
            <v-btn class="card-btn" @click="toPost(card)">
              <template #prepend>
                <img src="../assets/icons/circle-check.svg" alt="check">查看
              </template>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
// utils
import { createTGWindow } from "../utils/TGWindow";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { PositionCard } from "../plugins/Mys/interface/position";
// loading
const loading = ref(true as boolean);

// 数据
const positionCards = ref([] as PositionCard[]);
const positionTimeGet = ref({} as Record<number, string>);
const positionTimeEnd = ref({} as Record<number, number>);
const router = useRouter();

// expose
defineExpose({
  name: "近期活动",
  loading,
});

onMounted(async () => {
  const positionData = await MysOper.Position.get();
  if (!positionData) {
    console.error("获取近期活动失败");
    return;
  }
  positionCards.value = MysOper.Position.card(positionData);
  positionCards.value.forEach((card) => {
    positionTimeGet.value[card.post_id] = getLastPositionTime(card.time.end_stamp - Date.now());
    positionTimeEnd.value[card.post_id] = card.time.end_stamp;
  });
  setInterval(() => {
    positionCards.value.forEach((card) => {
      const time = card.time.end_stamp - Date.now();
      if (time <= 0) {
        positionTimeGet.value[card.post_id] = "已结束";
        return;
      }
      positionTimeGet.value[card.post_id] = getLastPositionTime(time);
    });
  }, 1000);
  loading.value = false;
});

function getLastPositionTime (time: number) {
  const day = Math.floor(time / (24 * 3600 * 1000));
  const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
  const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
  const second = Math.floor((time % (60 * 1000)) / 1000);
  return `${day}天 ${hour.toFixed(0).padStart(2, "0")}:${minute.toFixed(0).padStart(2, "0")}:${second
    .toFixed(0)
    .padStart(2, "0")}`;
}

async function toPost (card: PositionCard) {
  // 获取路由路径
  const path = router.resolve({
    name: "帖子详情",
    params: {
      // eslint-disable-next-line camelcase
      post_id: card.post_id,
    },
  }).href;
  // 打开新窗口
  createTGWindow(path, "近期活动", card.title, 960, 720, false, false);
}
</script>

<style lang="css" scoped>
.position-act-icon {
  width: 20px;
  height: 20px;
  display: inline-block;
}

.position-card {
  margin-top: 10px;
  font-family: Genshin, serif;
  background: var(--content-bg-1);
  border-radius: 10px;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(400px, 1fr));
  grid-gap: 20px;
  margin-top: 10px;
}
</style>
