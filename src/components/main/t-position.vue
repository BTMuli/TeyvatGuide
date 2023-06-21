<template>
  <div class="position-box">
    <div class="position-title">
      <img src="../../assets/icons/board.svg" alt="act" class="position-icon">
      近期活动
    </div>
    <div v-if="!loading" class="position-grid">
      <v-card
        v-for="card in positionCards"
        :key="card.post_id"
        style="background: var(--content-bg-2); color: #546d8b; border-radius: 5px"
      >
        <v-list style="background: var(--content-bg-2); color: #546d8b">
          <v-list-item :title="card.title" :subtitle="card.abstract">
            <template #prepend>
              <v-avatar rounded="0" style="cursor: pointer" @click="toPost(card)">
                <v-img :src="card.icon" style="border-radius: 10px" />
              </v-avatar>
            </template>
            <template #append>
              <v-btn variant="outlined" @click="toPost(card)">
                查看
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-divider class="border-opacity-75" />
        <v-card-text>
          <div style="min-width: 200px;display: inline-block">
            <v-icon>mdi-calendar-clock</v-icon>
            {{ card.time.start }} ~ {{ card.time.end }}
          </div>
          <div style="min-width: 200px;display: inline-block">
            <v-icon>mdi-clock-outline</v-icon>剩余时间：
            <span v-if="positionTimeGet[card.post_id] !== '已结束'" style="color: #90caf9">{{
              positionTimeGet[card.post_id]
            }}</span>
            <span v-if="positionTimeGet[card.post_id] === '已结束'" style="color: #ff6d6d">已结束</span>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
// utils
import { createTGWindow } from "../../utils/TGWindow";
// plugins
import MysOper from "../../plugins/Mys";
// interface
import { PositionCard } from "../../plugins/Mys/interface/position";

// vue
const router = useRouter();

// loading
const loading = ref(true as boolean);

// data
const positionCards = ref([] as PositionCard[]);
const positionTimeGet = ref({} as Record<number, string>); // 剩余时间/已结束/未知
const positionTimeEnd = ref({} as Record<number, number>); // 结束时间戳
const positionTimer = ref({} as Record<number, null>); // 定时器

// expose
defineExpose({
  name: "近期活动",
  loading,
});

function positionLastInterval (postId: number) {
  const timeGet = positionTimeGet.value[postId];
  if (timeGet === "未知" || timeGet === "已结束") {
    clearInterval(positionTimer.value[postId]);
    positionTimer.value[postId] = null;
    return;
  }
  const timeLast = positionTimeEnd.value[postId] - Date.now();
  if (timeLast <= 0) {
    positionTimeGet.value[postId] = "已结束";
  } else {
    positionTimeGet.value[postId] = getLastPositionTime(timeLast);
  }
}

onMounted(async () => {
  const positionData = await MysOper.Position.get();
  if (!positionData) {
    console.error("获取近期活动失败");
    return;
  }
  positionCards.value = MysOper.Position.card(positionData);
  positionCards.value.forEach((card) => {
    if (card.time.end_stamp === 0) {
      positionTimeGet.value[card.post_id] = "未知";
    } else {
      positionTimeGet.value[card.post_id] = getLastPositionTime(card.time.end_stamp - Date.now());
    }
    positionTimeEnd.value[card.post_id] = card.time.end_stamp;
    positionTimer.value[card.post_id] = setInterval(() => {
      positionLastInterval(card.post_id);
    }, 1000);
  });
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

onUnmounted(() => {
  Object.keys(positionTimer.value).forEach((key) => {
    clearInterval(positionTimer.value[Number(key)]);
  });
});
</script>

<style lang="css" scoped>
.position-box {
  margin-bottom: 10px;
  padding: 10px;
  font-family: Genshin, serif;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
  border-radius: 5px;
}

.position-title {
  color:rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
  font-size: 20px;
  display: flex;
}

.position-icon {
  width: 25px;
  height: 25px;
  margin-right: 10px;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px + 2rem), 1fr));
  grid-gap: 20px;
  margin-top: 10px;
}
</style>
