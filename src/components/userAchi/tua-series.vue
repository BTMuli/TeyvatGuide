<template>
  <div
    class="tuas-card"
    @click="selectSeries"
    v-if="data"
    :class="{ 'tuas-selected': props.cur === props.series }"
  >
    <div class="tuas-version">v{{ data.version }}</div>
    <div class="tuas-icon">
      <img alt="icon" :src="`/icon/achievement/${data.icon}.webp`" />
      <v-progress-circular
        class="progress"
        bg-color="var(--tgc-od-white)"
        color="var(--tgc-yellow-2)"
        :model-value="`${(overview.fin / overview.total) * 100}`"
      />
    </div>
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
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tuas-card {
  @include github-styles.github-card();

  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  height: 60px;
  border-radius: 4px;
  color: var(--box-text-1);
  column-gap: 8px;
  cursor: pointer;
  overflow: hidden;

  &.tuas-selected {
    background: var(--box-bg-1);
  }
}

.dark .tuas-card {
  @include github-styles.github-card("dark");

  &.tuas-selected {
    background: var(--box-bg-1);
  }
}

.tuas-version {
  @include github-styles.github-tag-dark-gen(#ffa726);

  position: absolute;
  right: 0;
  bottom: 0;
  width: 64px;
  border-right: unset;
  border-bottom: unset;
  border-top-left-radius: 20px;
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.tuas-icon {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 5px;
  border-radius: 50%;
  box-sizing: border-box;
  background: var(--tgc-dark-7);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
    height: 40px;
  }
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
