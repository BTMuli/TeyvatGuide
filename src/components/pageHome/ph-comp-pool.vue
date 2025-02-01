<template>
  <THomeCard :append="hasNew">
    <template #title>限时祈愿</template>
    <template #title-append>
      <v-switch class="pool-switch" @change="showNew = !showNew" />
      <span>{{ showNew ? "查看当前祈愿" : "查看后续祈愿" }}</span>
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
              <div class="left">
                <v-icon>mdi-calendar-clock</v-icon>
                <span>{{ pool.time.str }}</span>
              </div>
              <v-progress-linear
                :model-value="
                  pool.stat !== 'now' ? 100 : (pool.timeRest * 100) / pool.time.totalStamp
                "
                :rounded="true"
              />
              <div v-if="pool.stat !== 'now'" class="time">
                {{ pool.stat === "future" ? "未开始" : "已结束" }}
              </div>
              <div v-else class="time">
                <span>剩余时间：</span>
                <span>{{ stamp2LastTime(pool.timeRest) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </THomeCard>
</template>
<script lang="ts" setup>
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import Mys from "@Mys/index.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

import THomeCard from "./ph-comp-card.vue";

import { useHomeStore } from "@/store/modules/home.js";
import { createPost, createTGWindow } from "@/utils/TGWindow.js";
import { stamp2LastTime } from "@/utils/toolFunc.js";

type TPoolEmits = (e: "success") => void;
type PoolStat = "future" | "now" | "past"; // 未开始 | 进行中 | 已结束
type PoolItem = TGApp.Plugins.Mys.Gacha.RenderCard & { timeRest: number; stat: PoolStat };

const emits = defineEmits<TPoolEmits>();
const { poolCover } = storeToRefs(useHomeStore());
const router = useRouter();
// eslint-disable-next-line no-undef
let timer: NodeJS.Timeout | null = null;

const showNew = ref<boolean>(false);
const poolCards = ref<Array<PoolItem>>([]);
const hasNew = computed<boolean>(
  () => poolCards.value.find((pool) => pool.stat === "future") !== undefined,
);
const poolSelect = computed<Array<PoolItem>>(() => {
  if (!hasNew.value) return poolCards.value;
  if (showNew.value) return poolCards.value.filter((pool) => pool.stat === "future");
  return poolCards.value.filter((pool) => pool.stat !== "future");
});

onMounted(async () => {
  const gachaData = await Mys.Gacha.get();
  let cards: Array<TGApp.Plugins.Mys.Gacha.RenderCard>;
  if (!checkCover(gachaData)) {
    cards = await Mys.Gacha.card(gachaData);
    const coverData: Record<string, string> = {};
    poolCards.value.map((pool) => {
      coverData[pool.id] = pool.cover;
      return pool;
    });
    poolCover.value = coverData;
  } else {
    cards = await Mys.Gacha.card(gachaData, poolCover.value);
  }
  for (const pool of cards) {
    const timeRest = pool.time.endStamp - Date.now();
    poolCards.value.push({
      ...pool,
      stat: timeRest > pool.time.totalStamp ? "future" : timeRest > 0 ? "now" : "past",
      timeRest: timeRest,
    });
  }
  if (timer !== null) clearInterval(timer);
  timer = setInterval(poolTimeout, 1000);
  emits("success");
});

function poolTimeout(): void {
  for (const pool of poolCards.value) {
    if (pool.stat === "past") {
      if (pool.timeRest !== -1) pool.timeRest = -1;
      continue;
    }
    const timeRest = pool.time.endStamp - Date.now();
    if (timeRest >= pool.time.totalStamp) {
      pool.stat = "future";
      pool.timeRest = timeRest;
      continue;
    }
    if (timeRest <= 0) {
      pool.stat = "past";
      pool.timeRest = -1;
      continue;
    }
    pool.stat = "now";
    pool.timeRest = timeRest;
  }
}

function checkCover(data: Array<TGApp.Plugins.Mys.Gacha.Data>): boolean {
  if (poolCover.value === undefined || Object.keys(poolCover.value).length === 0) return false;
  let checkList = data.length;
  Object.entries(poolCover.value).forEach(([key, value]: [string, unknown]) => {
    const pool = data.find((item) => item.id.toString() === key);
    if (pool && value !== "/source/UI/empty.webp") checkList--;
  });
  return checkList === 0;
}

async function toOuter(
  character: TGApp.Plugins.Mys.Gacha.RenderItem,
  title: string,
): Promise<void> {
  if (character.info !== undefined) {
    await router.push({ name: "角色图鉴", params: { id: character.info.id } });
    return;
  }
  const url = character.url;
  if (url === "") {
    showSnackbar.warn("链接为空!");
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
    ltSize: "15px",
    innerHeight: 20,
    innerIcon: `/icon/weapon/${info.weapon}.webp`,
    innerText: info.name,
  };
}

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
  timer = null;
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
  box-shadow: 2px 2px 5px var(--common-shadow-2);
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
