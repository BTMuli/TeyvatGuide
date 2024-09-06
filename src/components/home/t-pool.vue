<template>
  <THomeCard :append="hasNew">
    <template #title>限时祈愿</template>
    <template #title-append>
      <v-switch class="pool-switch" @change="switchPool" />
      {{ showNew ? "查看当前祈愿" : "查看后续祈愿" }}
    </template>
    <template #default>
      <div class="pool-grid">
        <div v-for="pool in poolSelect" :key="pool.postId" class="pool-card">
          <div class="pool-cover" @click="createPost(pool.postId, pool.title)">
            <img :src="pool.cover" alt="cover" />
          </div>
          <div class="pool-bottom">
            <div class="pool-character">
              <div class="pool-icons">
                <div
                  v-for="character in pool.characters"
                  :key="character.url"
                  class="pool-icon"
                  @click="toOuter(character, pool.title)"
                >
                  <TItembox
                    :title="character.info.name"
                    v-if="character.info"
                    :model-value="getCBox(character.info)"
                  />
                  <img v-else :src="character.icon" alt="character" />
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
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

import Mys from "../../plugins/Mys/index.js";
import { useHomeStore } from "../../store/modules/home.js";
import { createPost, createTGWindow } from "../../utils/TGWindow.js";
import { stamp2LastTime } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

import THomeCard from "./t-homecard.vue";

// store
const homeStore = storeToRefs(useHomeStore());

const router = useRouter();
const hasNew = ref<boolean>(false);
const showNew = ref<boolean>(false);

// data
const poolCards = ref<TGApp.Plugins.Mys.Gacha.RenderCard[]>([]);
const poolSelect = ref<TGApp.Plugins.Mys.Gacha.RenderCard[]>([]);
const poolTimeGet = ref<Record<number, string>>({});
const poolTimePass = ref<Record<number, number>>({});
const timer = ref<Record<number, any>>({});

interface TPoolEmits {
  (e: "success"): void;
}

const emits = defineEmits<TPoolEmits>();

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
    const coverData: Record<string, string> = {};
    poolCards.value.map((pool) => {
      coverData[pool.id] = pool.cover;
      return pool;
    });
    homeStore.poolCover.value = coverData;
  } else {
    poolCards.value = await Mys.Gacha.card(gachaData, homeStore.poolCover.value);
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
      (pool) => poolTimeGet.value[pool.postId] !== "未开始",
    );
    hasNew.value =
      poolCards.value.filter((pool) => poolTimeGet.value[pool.postId] === "未开始").length > 0;
  } else {
    poolSelect.value = poolCards.value;
    hasNew.value = false;
  }
  emits("success");
});

// 检测新卡池
function checkCover(data: TGApp.Plugins.Mys.Gacha.Data[]): boolean {
  if (!homeStore.poolCover || Object.keys(homeStore.poolCover).length === 0) {
    return false;
  }
  const cover = homeStore.poolCover;
  if (cover === undefined) return false;
  let checkList = data.length;
  Object.entries(cover).forEach(([key, value]: [string, unknown]) => {
    const pool = data.find((item: TGApp.Plugins.Mys.Gacha.Data) => item.id.toString() === key);
    if (pool && value !== "/source/UI/empty.webp") {
      checkList--;
    }
  });
  return checkList === 0;
}

async function toOuter(
  character: TGApp.Plugins.Mys.Gacha.RenderItem,
  title: string,
): Promise<void> {
  if (character.info !== undefined) {
    await router.push({
      name: "角色图鉴",
      params: {
        id: character.info.id,
      },
    });
    return;
  }
  const url = character.url;
  if (url === "") {
    showSnackbar({
      text: "链接为空!",
      color: "error",
    });
    return;
  }
  await createTGWindow(url, "Sub_window", `Pool_${title}`, 1200, 800, true, true);
}

function getCBox(info: TGApp.App.Character.WikiBriefInfo): TItemBoxData {
  return {
    bg: `/icon/bg/${info.star}-Star.webp`,
    icon: `/WIKI/character/${info.id}.webp`,
    size: "60px",
    height: "60px",
    display: "inner",
    clickable: true,
    lt: `/icon/element/${info.element}元素.webp`,
    ltSize: "20px",
    innerHeight: 20,
    innerIcon: `/icon/weapon/${info.weapon}.webp`,
    innerText: info.name,
  };
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
      (pool) => poolTimeGet.value[pool.postId] !== "未开始",
    );
  }
}

onUnmounted(() => {
  Object.keys(timer.value).forEach((key) => {
    clearInterval(timer.value[Number(key)]);
  });
  timer.value = {};
});
</script>

<style lang="css" scoped>
.pool-switch {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-right: 5px;
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
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
}

.pool-character {
  display: flex;
  overflow: hidden auto;
  width: auto;
  max-width: 280px;
  height: 60px;
  margin: 10px;
}

.pool-character::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: var(--common-shadow-t-4);
}

.pool-icons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 10px;
  gap: 10px;
}

.pool-icon {
  width: 60px;
  height: 60px;
  transition: all ease-in-out 0.3s;
}

.pool-icon:hover {
  transform: scale(0.95);
  transition: all ease-in-out 0.3s;
}

.pool-icon img {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 5px;
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
