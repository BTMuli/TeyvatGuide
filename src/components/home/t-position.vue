<template>
  <div class="position-box">
    <div class="position-title">
      <img src="../../assets/icons/board.svg" alt="act" />
      <span>近期活动</span>
    </div>
    <div v-if="!loading" class="position-grid">
      <v-card v-for="card in positionCards" :key="card.postId" class="position-card">
        <v-list class="position-list">
          <v-list-item :title="card.title" :subtitle="card.abstract">
            <template #prepend>
              <v-avatar rounded="0" @click="toPost(card)">
                <v-img :src="card.icon" class="position-icon" />
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
            <span v-if="positionTimeGet[card.postId] !== '已结束'" style="color: #126e82">{{
              positionTimeGet[card.postId]
            }}</span>
            <!-- 粉红 -->
            <span v-if="positionTimeGet[card.postId] === '已结束'" style="color: #f2b9b2"
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
import { stamp2LastTime } from "../../utils/toolFunc";
// plugins
import Mys from "../../plugins/Mys";

// vue
const router = useRouter();

// loading
const loading = ref<boolean>(true);

// data
const positionCards = ref<TGApp.Plugins.Mys.Position.RenderCard[]>([]);
const positionTimeGet = ref<Record<number, string>>({}); // 剩余时间/已结束/未知
const positionTimeEnd = ref<Record<number, number>>({}); // 结束时间戳
const positionTimer = ref<Record<number, any>>({}); // 定时器

// expose
defineExpose({
  name: "近期活动",
  loading,
});

function positionLastInterval(postId: number): void {
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
    positionTimeGet.value[postId] = stamp2LastTime(timeLast);
  }
}

onMounted(async () => {
  const positionData = await Mys.Position.get();
  if (!positionData) {
    console.error("获取近期活动失败");
    return;
  }
  positionCards.value = Mys.Position.card(positionData);
  positionCards.value.forEach((card) => {
    if (card.time.endStamp === 0) {
      positionTimeGet.value[card.postId] = "未知";
    } else {
      positionTimeGet.value[card.postId] = stamp2LastTime(card.time.endStamp - Date.now());
    }
    positionTimeEnd.value[card.postId] = card.time.endStamp;
    positionTimer.value[card.postId] = setInterval(() => {
      positionLastInterval(card.postId);
    }, 1000);
  });
  loading.value = false;
});

async function toPost(card: TGApp.Plugins.Mys.Position.RenderCard): Promise<void> {
  // 获取路由路径
  const path = router.resolve({
    name: "帖子详情",
    params: {
      post_id: card.postId,
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
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
}

.position-title {
  display: flex;
  align-items: center;
  justify-content: start;
  font-family: var(--font-title);
  font-size: 20px;
}

.position-title img {
  width: 20px;
  height: 20px;
  margin: 0 10px;
}

.position-grid {
  display: grid;
  margin-top: 10px;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(calc(400px + 2rem), 1fr));
}

.position-card {
  border-radius: 5px;
  background: var(--content-box-bg-1);
  color: var(--common-bgt-1);
}

.position-list {
  background: inherit;
  color: inherit;
  font-family: var(--font-title);
}

.position-icon {
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: contain;
}

.position-icon :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s;
}

.position-icon :hover {
  cursor: pointer;
  scale: 1.5;
}

.position-card-text {
  display: inline-block;
  min-width: 200px;
  align-items: center;
}

.position-card-text :nth-child(1) {
  margin: 0 5px;
}
</style>
