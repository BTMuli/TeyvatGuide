<template>
  <div class="tuas-card" @click="selectSeries" v-if="data">
    <div class="tuas-version">v{{ data.version }}</div>
    <img alt="icon" class="tuas-icon" :src="data.icon" />
    <div class="tuas-content">
      <span :title="data.name">{{ data.name }}</span>
      <span>{{ overview.fin }}/{{ overview.total }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAchi from "@Sqlite/modules/userAchi.js";
import { type Event, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, shallowRef, watch } from "vue";

import { AppAchievementSeriesData } from "@/data/index.js";

type TuaSeriesProps = { uid: number; series: number; cur: number };
type TuaSeriesEmits = (e: "selectSeries", v: number) => void;

const props = defineProps<TuaSeriesProps>();
const emits = defineEmits<TuaSeriesEmits>();

const overview = shallowRef<TGApp.Sqlite.Achievement.Overview>({ fin: 0, total: 0 });
const data = computed<TGApp.App.Achievement.Series | undefined>(() =>
  AppAchievementSeriesData.find((s) => s.id === props.series),
);
let achiListener: UnlistenFn | null = null;

onMounted(async () => {
  await refreshOverview();
  achiListener = await listenAchi();
});

watch(
  () => props.uid,
  async () => await refreshOverview(),
);

async function refreshOverview(): Promise<void> {
  overview.value = await TSUserAchi.getOverview(props.uid, props.series);
}

async function listenAchi(): Promise<UnlistenFn> {
  return await listen<number>("updateAchi", async (e: Event<number>) => {
    if (e.payload === props.series) await refreshOverview();
  });
}

onUnmounted(async () => {
  if (achiListener !== null) {
    achiListener();
    achiListener = null;
  }
});

function selectSeries(): void {
  if (props.cur === props.series) {
    showSnackbar.warn("已选中当前系列！");
    return;
  }
  emits("selectSeries", props.series);
}
</script>
<style lang="css" scoped>
.tuas-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  column-gap: 10px;
  cursor: pointer;
}

.tuas-version {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 80px;
  border-top: 1px solid var(--common-shadow-1);
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  border-bottom-right-radius: 10px;
  border-top-left-radius: 20px;
  color: var(--tgc-yellow-1);
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
  text-shadow: 1px 1px 1px var(--common-shadow-1);
}

.tuas-icon {
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 50%;
  background: var(--tgc-dark-7);
}

.tuas-content {
  display: flex;
  width: 100%;
  flex-flow: column wrap;
  align-items: flex-start;
  justify-content: center;
  color: var(--box-text-1);
  text-align: left;
}

.tuas-content :first-child {
  font-family: var(--font-title);
  font-size: 14px;
}

.tuas-content :last-child {
  font-size: 12px;
  opacity: 0.8;
}
</style>
