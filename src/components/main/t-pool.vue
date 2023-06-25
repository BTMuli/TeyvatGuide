<template>
  <div class="pool-box">
    <div class="pool-title">
      <img src="../../assets/icons/icon-wish.svg" alt="wish">
      限时祈愿
    </div>
    <div v-if="!loading" class="pool-grid">
      <v-card
        v-for="pool in poolCards"
        :key="pool.post_id"
        class="pool-card"
      >
        <v-list class="pool-list">
          <v-list-item :title="pool.title" :subtitle="pool.subtitle">
            <template #prepend>
              <img :src="pool.voice.icon" class="pool-sideIcon" alt="icon">
            </template>
            <template v-if="pool.voice.url" #append>
              <audio :src="pool.voice.url" controls />
            </template>
          </v-list-item>
        </v-list>
        <div class="pool-cover" @click="toPost(pool)">
          <img :src="pool.cover" alt="cover">
        </div>
        <div class="pool-character">
          <div class="pool-icon-grid">
            <div
              v-for="character in pool.characters"
              :key="character.url"
              class="pool-icon"
              @click="toOuter(character.url, pool.title)"
            >
              <img :src="character.icon" alt="character">
            </div>
          </div>
          <div class="pool-clock">
            <v-progress-circular :model-value="poolTimePass[pool.post_id]" size="100" width="10" :color="poolColor[pool.post_id]">
              {{ poolTimeGet[pool.post_id] }}
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
import MysOper from "../../plugins/Mys";
// interface
import { GachaCard, GachaData } from "../../plugins/Mys/interface/gacha";

// vue
const router = useRouter();

// store
const homeStore = useHomeStore();

// loading
const loading = ref(true as boolean);
// snackbar
const showBar = ref(false as boolean);
const barText = ref("");
const barColor = ref("error" as string);

// data
const poolCards = ref([] as GachaCard[]);
const poolTimeGet = ref({} as Record<number, string>);
const poolTimePass = ref({} as Record<number, number>);
const poolColor = ref({} as Record<number, string>);
const timer = ref({} as Record<number, any>);

// expose
defineExpose({
  name: "限时祈愿",
  loading,
});

function poolLastInterval (postId: number) {
  const pool = poolCards.value.find((pool) => pool.post_id === postId);
  if (!pool) return;
  if (poolTimeGet.value[postId] === "未开始") {
    const isStart = pool.time.start_stamp - Date.now();
    if (isStart > 0) return;
    poolTimeGet.value[postId] = getLastPoolTime(pool.time.end_stamp - Date.now());
    poolTimePass.value[postId] = pool.time.end_stamp - Date.now();
    poolColor.value[postId] = "#90caf9";
  } else {
    const isEnd = pool.time.end_stamp - Date.now();
    poolTimeGet.value[postId] = getLastPoolTime(isEnd);
    poolTimePass.value[postId] =
        ((pool.time.end_stamp - Date.now()) / (pool.time.end_stamp - pool.time.start_stamp)) * 100;
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
  const gachaData = await MysOper.Gacha.get();
  if (!gachaData) {
    console.error("获取限时祈愿数据失败");
    return;
  }
  if (!checkCover(gachaData)) {
    poolCards.value = await MysOper.Gacha.card(gachaData);
    const coverData: Record<number, string> = {};
    poolCards.value.map((pool) => {
      coverData[pool.post_id] = pool.cover;
      return pool;
    });
    homeStore.poolCover = coverData;
  } else {
    poolCards.value = await MysOper.Gacha.card(gachaData, homeStore.poolCover);
  }
  poolCards.value.map((pool) => {
    poolTimeGet.value[pool.post_id] = getLastPoolTime(pool.time.end_stamp - Date.now());
    poolTimePass.value[pool.post_id] = pool.time.end_stamp - Date.now();
    if (poolTimePass.value[pool.post_id] <= 0) {
      poolTimeGet.value[pool.post_id] = "已结束";
      poolTimePass.value[pool.post_id] = 100;
      poolColor.value[pool.post_id] = "#f44336";
    } else if (pool.time.start_stamp - Date.now() > 0) {
      poolTimeGet.value[pool.post_id] = "未开始";
      poolTimePass.value[pool.post_id] = 100;
      poolColor.value[pool.post_id] = "#32A9CA";
    } else {
      poolColor.value[pool.post_id] = "#90caf9";
    }
    timer.value[pool.post_id] = setInterval(() => {
      poolLastInterval(pool.post_id);
    }, 1000);
    return pool;
  });
  loading.value = false;
});

// 检测是否有新的限时祈愿
function checkCover (data: GachaData[]) {
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

async function toOuter (url: string, title: string) {
  if (!url) {
    barText.value = "链接为空!";
    barColor.value = "error";
    showBar.value = true;
    return;
  }
  createTGWindow(url, "祈愿", title, 1200, 800, true, true);
}

function getLastPoolTime (time: number) {
  const hour = Math.floor(time / 1000 / 60 / 60);
  const minute = Math.floor((time / 1000 / 60 / 60 - hour) * 60);
  const second = Math.floor(((time / 1000 / 60 / 60 - hour) * 60 - minute) * 60);
  return `${hour}:${minute.toFixed(0).padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

function toPost (pool: GachaCard) {
  const path = router.resolve({
    name: "帖子详情",
    params: {
      // eslint-disable-next-line camelcase
      post_id: pool.post_id.toString(),
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
  margin-bottom: 10px;
  padding: 10px;
  box-shadow: 0 0 10px var(--common-bg-4);
  border-radius: 5px;
}

.pool-title {
  color: var(--common-text);
	font-family: var(--font-title);
  font-size: 20px;
  display: flex;
}

.pool-title img {
  width: 25px;
  height: 25px;
  transform: translate(0, 2px);
  margin-right: 10px;
	border-radius: 50%;
  background: var(--common-bg-2);
}

.pool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
  grid-gap: 20px;
  margin-top: 10px;
}

.pool-card {
	background: #45b787; /* 蛙绿 */
	color: #eef7f2; /* 丹白 */
	border-radius: 5px;
}

.dark .pool-card {
	background: #1f2623; /* 苷蓝绿 */
}

.pool-list {
	font-family: var(--font-title);
	background: inherit;
	color: inherit;
}

.pool-sideIcon {
  margin-top: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
	background: var(--common-bg-2);
}

.pool-cover {
  margin: 0 20px 10px;
  width: calc(100% - 40px);
  height: auto;
  overflow: hidden;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pool-cover img {
	width: 100%;
  transition: all 0.5s;
  border-radius: 10px;
}

.pool-cover :hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.5s;
}

.pool-character {
  margin: 0 20px;
  width: 100%;
  height: 70px;
  display: flex;
}

.pool-icon-grid {
	display: grid;
	grid-template-columns: repeat(4,70px);
	grid-column-gap: 10px;
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
