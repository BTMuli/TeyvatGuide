<template>
  <div class="pool-box">
    <div class="pool-title">
      <div class="pool-title-left">
        <img src="../../assets/icons/icon-wish.svg" alt="wish" />
        <span>限时祈愿</span>
      </div>
      <div class="pool-title-right">
        <v-switch
          class="pool-switch"
          color="var(--common-shadow-4)"
          variant="outline"
          :label="showNew ? '查看当前祈愿' : '查看后续祈愿'"
          v-show="hasNew"
          @change="switchPool"
        />
      </div>
    </div>
    <div v-if="!loading" class="pool-grid">
      <div v-for="pool in poolSelect" :key="pool.postId" class="pool-card">
        <div class="pool-cover" @click="createPost(pool.postId, pool.title)">
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
              {{ pool.time.str }}
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

import Mys from "../../plugins/Mys";
import { useHomeStore } from "../../store/modules/home";
import { createPost, createTGWindow } from "../../utils/TGWindow";
import { stamp2LastTime } from "../../utils/toolFunc";

// store
const homeStore = useHomeStore();

// loading
const loading = ref<boolean>(true);
// snackbar
const showBar = ref<boolean>(false);
const barText = ref<string>("");
const barColor = ref<string>("error");

const hasNew = ref<boolean>(false);
const showNew = ref<boolean>(false);

// data
const poolCards = ref<TGApp.Plugins.Mys.Gacha.RenderCard[]>([]);
const poolSelect = ref<TGApp.Plugins.Mys.Gacha.RenderCard[]>([]);
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
      showNew.value = false;
    } else if (pool.time.startStamp - Date.now() > 0) {
      poolTimeGet.value[pool.postId] = "未开始";
      poolTimePass.value[pool.postId] = 100;
    }
    timer.value[pool.postId] = setInterval(() => {
      poolLastInterval(pool.postId);
    }, 1000);
    return pool;
  });
  if (poolCards.value.length > 2) {
    poolSelect.value = poolCards.value.filter(
      (pool) =>
        poolTimeGet.value[pool.postId] !== "未开始" && poolTimeGet.value[pool.postId] !== "已结束",
    );
    hasNew.value =
      poolCards.value.filter((pool) => poolTimeGet.value[pool.postId] === "未开始").length > 0;
  } else {
    poolSelect.value = poolCards.value;
    hasNew.value = false;
  }
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

// 更换显示的卡池
async function switchPool(): Promise<void> {
  showNew.value = !showNew.value;
  if (showNew.value) {
    poolSelect.value = poolCards.value.filter(
      (pool) => poolTimeGet.value[pool.postId] === "未开始",
    );
  } else {
    poolSelect.value = poolCards.value.filter(
      (pool) =>
        poolTimeGet.value[pool.postId] !== "未开始" && poolTimeGet.value[pool.postId] !== "已结束",
    );
  }
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
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
  font-size: 20px;
}

.pool-title-left {
  display: flex;
  align-items: center;
  justify-content: start;
  color: var(--common-text-title);
  column-gap: 10px;
}

.pool-title-left img {
  width: 25px;
  height: 25px;
  filter: brightness(0.8);
}

.pool-title-right {
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 15px;
}

.pool-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  color: var(--box-text-1);
}

.pool-grid {
  display: grid;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.pool-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 5px;
  aspect-ratio: 69 / 32;
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
