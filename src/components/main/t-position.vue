<template>
  <div class="position-box">
    <div class="position-title">
      <img src="../../assets/icons/board.svg" alt="act" />
      <span>近期活动</span>
    </div>
    <div v-if="!loading" class="position-grid">
      <v-card v-for="card in positionCards" :key="card.post_id" class="position-card">
        <v-list class="position-list">
          <v-list-item :title="card.title" :subtitle="card.abstract">
            <template #prepend>
              <v-avatar rounded="0" @click="toPost(card)">
                <v-img :src="card.icon" />
              </v-avatar>
            </template>
            <template #append>
              <v-btn variant="outlined" @click="toPost(card)"> 查看 </v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-divider class="border-opacity-75" />
        <v-card-text>
          <div class="position-card-text">
            <v-icon>mdi-calendar-clock</v-icon>
            <span>{{ card.time.start }} ~ {{ card.time.end }}</span>
          </div>
          <div class="position-card-text">
            <v-icon>mdi-clock-outline</v-icon>
            <span>剩余时间：</span>
            <!-- 玉鈫蓝 -->
            <span v-if="positionTimeGet[card.post_id] !== '已结束'" style="color: #126e82">{{
              positionTimeGet[card.post_id]
            }}</span>
            <!-- 粉红 -->
            <span v-if="positionTimeGet[card.post_id] === '已结束'" style="color: #f2b9b2"
              >已结束</span
            >
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

function positionLastInterval(postId: number) {
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

function getLastPositionTime(time: number) {
  const day = Math.floor(time / (24 * 3600 * 1000));
  const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
  const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
  const second = Math.floor((time % (60 * 1000)) / 1000);
  return `${day}天 ${hour.toFixed(0).padStart(2, "0")}:${minute
    .toFixed(0)
    .padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

async function toPost(card: PositionCard) {
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
  box-shadow: 0 0 10px var(--common-shadow-4);
  border-radius: 5px;
}

.position-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: start;
}

.position-title img {
  width: 20px;
  height: 20px;
  margin: 0 10px;
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px + 2rem), 1fr));
  grid-gap: 20px;
  margin-top: 10px;
}

.position-card {
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
  border-radius: 5px;
}

.position-list {
  font-family: var(--font-title);
  background: inherit;
  color: inherit;
}

.position-list :deep(img) {
  border-radius: 5px;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: all 0.3s;
}

.position-list :deep(img):hover {
  cursor: pointer;
  scale: 1.5;
}

.position-card-text {
  min-width: 200px;
  display: inline-block;
  align-items: center;
}

.position-card-text :nth-child(1) {
  margin: 0 5px;
}
</style>
