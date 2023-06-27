<template>
  <div class="pool-box">
    <div class="pool-title">
      <img src="../../assets/icons/icon-wish.svg" alt="wish" />
      限时祈愿
    </div>
    <div v-if="!loading" class="pool-grid">
      <v-card v-for="pool in poolCards" :key="pool.postId" class="pool-card">
        <v-list class="pool-list">
          <v-list-item :title="pool.title" :subtitle="pool.subtitle">
            <!-- todo 点击播放语音 -->
            <template #prepend>
              <img :src="pool.voice.icon" class="pool-voice-icon" alt="icon" />
            </template>
            <template v-if="pool.voice.url" #append>
              <audio :src="pool.voice.url" controls />
            </template>
          </v-list-item>
        </v-list>
        <div class="pool-cover" @click="toPost(pool)">
          <img :src="pool.cover" alt="cover" />
        </div>
        <div class="pool-character">
          <div class="pool-icon-grid">
            <div
              v-for="character in pool.characters"
              :key="character.url"
              class="pool-icon"
              @click="toOuter(character.url, pool.title)"
            >
              <img :src="character.icon" alt="character" />
            </div>
          </div>
          <div class="pool-clock">
            <v-progress-circular
              :model-value="poolTimePass[pool.postId]"
              size="100"
              width="10"
              :color="poolColor[pool.postId]"
            >
              {{ poolTimeGet[pool.postId] }}
            </v-progress-circular>
          </div>
        </div>
        <v-card-text>
          <span style="width: 60%">
            <v-icon>mdi-calendar-clock</v-icon>
            {{ pool.time.start }}~{{ pool.time.end }}
          </span>
        </v-card-text>
      </v-card>
    </div>
    <v-snackbar v-model="showBar" :color="barColor" timeout="1000">
      {{ barText }}
    </v-snackbar>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
// store
import { useHomeStore } from "../../store/modules/home";
// utils
import { createTGWindow } from "../../utils/TGWindow";
// plugins
import Mys from "../../plugins/Mys";

// vue
const router = useRouter();

// store
const homeStore = useHomeStore();

// loading
const loading = ref<boolean>(true);
// snackbar
const showBar = ref<boolean>(false);
const barText = ref<string>("");
const barColor = ref<string>("error");

// data
const poolCards = ref<TGApp.Plugins.Mys.Gacha.RenderCard[]>([]);
const poolTimeGet = ref<Record<number, string>>({});
const poolTimePass = ref<Record<number, number>>({});
const poolColor = ref<Record<number, string>>({});
const timer = ref<Record<number, any>>({});

// expose
defineExpose({
  name: "限时祈愿",
  loading,
});

function poolLastInterval(postId: number) {
  const pool = poolCards.value.find((pool) => pool.postId === postId);
  if (!pool) return;
  if (poolTimeGet.value[postId] === "未开始") {
    const isStart = pool.time.startStamp - Date.now();
    if (isStart > 0) return;
    poolTimeGet.value[postId] = getLastPoolTime(pool.time.endStamp - Date.now());
    poolTimePass.value[postId] = pool.time.endStamp - Date.now();
    poolColor.value[postId] = "#90caf9";
  } else {
    const isEnd = pool.time.endStamp - Date.now();
    poolTimeGet.value[postId] = getLastPoolTime(isEnd);
    poolTimePass.value[postId] =
      ((pool.time.endStamp - Date.now()) / (pool.time.endStamp - pool.time.startStamp)) * 100;
    if (isEnd >= 0) return;
    clearInterval(timer.value[postId]);
    timer.value[postId] = null;
    poolTimePass.value[postId] = 100;
    poolTimeGet.value[postId] = "已结束";
    poolColor.value[postId] = "#f44336";
  }
  return pool;
}

onMounted(async () => {
  const gachaData = await Mys.Gacha.get();
  if (!gachaData) {
    console.error("获取限时祈愿数据失败");
    return;
  }
  if (!checkCover(gachaData)) {
    poolCards.value = await Mys.Gacha.card(gachaData);
    const coverData: Record<number, string> = {};
    poolCards.value.map((pool) => {
      coverData[pool.postId] = pool.cover;
      return pool;
    });
    homeStore.poolCover = coverData;
  } else {
    poolCards.value = await Mys.Gacha.card(gachaData, homeStore.poolCover);
  }
  poolCards.value.map((pool) => {
    poolTimeGet.value[pool.postId] = getLastPoolTime(pool.time.endStamp - Date.now());
    poolTimePass.value[pool.postId] = pool.time.endStamp - Date.now();
    if (poolTimePass.value[pool.postId] <= 0) {
      poolTimeGet.value[pool.postId] = "已结束";
      poolTimePass.value[pool.postId] = 100;
      poolColor.value[pool.postId] = "#f44336";
    } else if (pool.time.startStamp - Date.now() > 0) {
      poolTimeGet.value[pool.postId] = "未开始";
      poolTimePass.value[pool.postId] = 100;
      poolColor.value[pool.postId] = "#32A9CA";
    } else {
      poolColor.value[pool.postId] = "#90caf9";
    }
    timer.value[pool.postId] = setInterval(() => {
      poolLastInterval(pool.postId);
    }, 1000);
    return pool;
  });
  loading.value = false;
});

// 检测新卡池
function checkCover(data: TGApp.Plugins.Mys.Gacha.Data[]) {
  // 如果没有缓存
  if (!homeStore.poolCover || Object.keys(homeStore.poolCover).length === 0) {
    return false;
  }
  // 获取缓存
  const cover = homeStore.poolCover satisfies Record<number, string>;
  if (cover === undefined) {
    return false;
  }
  return data.every((item) => {
    const postId = item.activity_url.split("/").pop();
    if (!postId || isNaN(Number(postId))) {
      return false;
    }
    if (!Object.keys(cover).includes(postId)) {
      return false;
    } else {
      const coverUrl = Object.keys(cover).find((key) => key === postId);
      return coverUrl !== "/source/UI/empty.webp";
    }
  });
}

async function toOuter(url: string, title: string) {
  if (!url) {
    barText.value = "链接为空!";
    barColor.value = "error";
    showBar.value = true;
    return;
  }
  createTGWindow(url, "祈愿", title, 1200, 800, true, true);
}

function getLastPoolTime(time: number) {
  const hour = Math.floor(time / 1000 / 60 / 60);
  const minute = Math.floor((time / 1000 / 60 / 60 - hour) * 60);
  const second = Math.floor(((time / 1000 / 60 / 60 - hour) * 60 - minute) * 60);
  return `${hour}:${minute.toFixed(0).padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

function toPost(pool: TGApp.Plugins.Mys.Gacha.RenderCard) {
  const path = router.resolve({
    name: "帖子详情",
    params: {
      post_id: pool.postId.toString(),
    },
  }).href;
  createTGWindow(path, "限时祈愿", pool.title, 960, 720, false, false);
}

onUnmounted(() => {
  Object.keys(timer.value).forEach((key) => {
    clearInterval(timer.value[Number(key)]);
  });
});
</script>

<style lang="css" scoped>
.pool-box {
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.pool-title {
  display: flex;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.pool-title img {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  margin-right: 10px;
  background: var(--common-shadow-2);
  transform: translate(0, 2px);
}

.pool-grid {
  display: grid;
  margin-top: 10px;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
}

.pool-card {
  border-radius: 5px;
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
}

.pool-list {
  background: inherit;
  color: inherit;
  font-family: var(--font-title);
}

.pool-voice-icon {
  width: 40px;
  height: 40px;
  transform: translateY(-5px);
}

.pool-cover {
  display: flex;
  overflow: hidden;
  width: calc(100% - 40px);
  height: auto;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  margin: 0 20px 10px;
}

.pool-cover img {
  width: 100%;
  border-radius: 10px;
  transition: all 0.5s;
}

.pool-cover :hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.5s;
}

.pool-character {
  display: flex;
  width: 100%;
  height: 70px;
  margin: 0 20px;
}

.pool-icon-grid {
  display: grid;
  grid-column-gap: 10px;
  grid-template-columns: repeat(4, 70px);
}

.pool-icon {
  width: 70px;
  height: 70px;
  border-radius: 5px;
}

.pool-icon img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
  cursor: pointer;
}

.pool-clock {
  margin-left: 60px;
  font-size: small;
}
</style>
