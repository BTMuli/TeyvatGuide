<template>
  <div class="pool-box">
    <div class="pool-title">
      <img src="../../assets/icons/icon-wish.svg" alt="wish" />
      限时祈愿
    </div>
    <div v-if="!loading" class="pool-grid">
      <div v-for="pool in poolCards" :key="pool.postId" class="pool-card">
        <div class="pool-cover" @click="toPost(pool)">
          <img :src="pool.cover" alt="cover" />
        </div>
        <div class="pool-bottom">
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
          </div>
          <div class="pool-time">
            <div>
              <v-icon>mdi-calendar-clock</v-icon>
              {{ pool.time.start }}~{{ pool.time.end }}
            </div>
            <v-progress-linear :model-value="poolTimePass[pool.postId]" :rounded="true">
            </v-progress-linear>
            <div v-if="poolTimeGet[pool.postId] === '已结束'">
              {{ poolTimeGet[pool.postId] }}
            </div>
            <div v-else>
              <span>剩余时间：</span>
              <span>
                {{ poolTimeGet[pool.postId] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <v-snackbar v-model="showBar" :color="barColor" timeout="1000">
      {{ barText }}
    </v-snackbar>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

import Mys from "../../plugins/Mys";
import { useHomeStore } from "../../store/modules/home";
import { createTGWindow } from "../../utils/TGWindow";
import { stamp2LastTime } from "../../utils/toolFunc";

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
const timer = ref<Record<number, any>>({});

// expose
defineExpose({
  name: "限时祈愿",
  loading,
});

function poolLastInterval(postId: number): TGApp.Plugins.Mys.Gacha.RenderCard | undefined {
  const pool = poolCards.value.find((pool) => pool.postId === postId);
  if (!pool) return;
  if (poolTimeGet.value[postId] === "未开始") {
    const isStart = pool.time.startStamp - Date.now();
    if (isStart > 0) return;
    poolTimeGet.value[postId] = stamp2LastTime(pool.time.endStamp - Date.now());
    poolTimePass.value[postId] = pool.time.endStamp - Date.now();
  } else {
    const isEnd = pool.time.endStamp - Date.now();
    poolTimeGet.value[postId] = stamp2LastTime(isEnd);
    poolTimePass.value[postId] =
      ((pool.time.endStamp - Date.now()) / (pool.time.endStamp - pool.time.startStamp)) * 100;
    if (isEnd >= 0) return;
    clearInterval(timer.value[postId]);
    timer.value[postId] = null;
    poolTimePass.value[postId] = 100;
    poolTimeGet.value[postId] = "已结束";
  }
  return pool;
}

onMounted(async () => {
  const gachaData = await Mys.Gacha.get();
  if (!gachaData) {
    console.error("获取限时祈愿数据失败");
    return;
  }
  console.log("获取限时祈愿数据成功");
  console.info(gachaData);
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
    poolTimeGet.value[pool.postId] = stamp2LastTime(pool.time.endStamp - Date.now());
    poolTimePass.value[pool.postId] = pool.time.endStamp - Date.now();
    if (poolTimePass.value[pool.postId] <= 0) {
      poolTimeGet.value[pool.postId] = "已结束";
      poolTimePass.value[pool.postId] = 100;
    } else if (pool.time.startStamp - Date.now() > 0) {
      poolTimeGet.value[pool.postId] = "未开始";
      poolTimePass.value[pool.postId] = 100;
    }
    timer.value[pool.postId] = setInterval(() => {
      poolLastInterval(pool.postId);
    }, 1000);
    return pool;
  });
  loading.value = false;
});

// 检测新卡池
function checkCover(data: TGApp.Plugins.Mys.Gacha.Data[]): boolean {
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

async function toOuter(url: string, title: string): Promise<void> {
  if (!url) {
    barText.value = "链接为空!";
    barColor.value = "error";
    showBar.value = true;
    return;
  }
  createTGWindow(url, "Sub_window", `Pool_${title}`, 1200, 800, true, true);
}

function toPost(pool: TGApp.Plugins.Mys.Gacha.RenderCard): void {
  const path = router.resolve({
    name: "帖子详情",
    params: {
      post_id: pool.postId.toString(),
    },
  }).href;
  createTGWindow(path, "Sub_window", `Post_${pool.postId} ${pool.title}`, 960, 720, false, false);
}

onUnmounted(() => {
  Object.keys(timer.value).forEach((key) => {
    clearInterval(timer.value[Number(key)]);
  });
});
</script>

<style lang="css" scoped>
.pool-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
  gap: 10px;
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
  background: var(--common-shadow-4);
  transform: translate(0, 2px);
}

.pool-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pool-card {
  position: relative;
  overflow: hidden;
  width: 50%;
  border-radius: 5px;
  box-shadow: 0 5px 5px var(--common-shadow-4);
}

.pool-cover {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: auto;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
}

.pool-cover img {
  width: 100%;
  border-radius: 5px;
  transition: all 0.5s;
}

.pool-cover :hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.5s;
}

.pool-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(20px);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
}

.pool-character {
  display: flex;
  width: auto;
  height: 60px;
  margin: 10px;
}

.pool-icon-grid {
  display: grid;
  grid-column-gap: 10px;
  grid-template-columns: repeat(4, 60px);
}

.pool-icon {
  width: 60px;
  height: 60px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 8px;
  box-shadow: 0 0 5px rgb(0 0 0/20%);
  transition: all ease-in-out 0.3s;
}

.pool-icon:hover {
  transform: scale(1.1);
  transition: all ease-in-out 0.3s;
}

.pool-icon img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.pool-time {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-right: 10px;
  color: var(--tgc-white-1);
  font-size: 12px;
  gap: 10px;
  text-align: left;
}
</style>
