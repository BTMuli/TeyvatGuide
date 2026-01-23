<!-- 成就系列 -->
<template>
  <div
    v-if="series"
    v-show="!(hideFin && progress === 100)"
    :class="{
      'tuas-selected': props.cur === props.series.id,
      'tuas-radius': showCard,
    }"
    :title="series.name"
    class="tuas-card"
    @click="selectSeries"
  >
    <div class="tuas-version">v{{ series.version }}</div>
    <div v-if="showCard" class="tuas-reward">
      <img
        :class="progress === 100 ? 'finish' : ''"
        :src="`/WIKI/nameCard/bg/${series.card}.webp`"
        alt="card"
      />
    </div>
    <div :title="`完成进度:${progress}%`" class="tuas-icon">
      <img :src="`/icon/achievement/${series.icon}.webp`" alt="icon" />
      <v-progress-circular
        :model-value="progress"
        bg-color="var(--tgc-od-white)"
        class="progress"
        color="var(--tgc-yellow-2)"
      />
    </div>
    <div class="tuas-content">
      <span :title="series.name">{{ series.name }}</span>
      <span>{{ overview.fin }}/{{ overview.total }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TSUserAchi from "@Sqlm/userAchi.js";
import { type Event, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, shallowRef, watch } from "vue";

type TuaSeriesProps = {
  /** 存档 UID */
  uid: number;
  /** 成就系列数据 */
  series: TGApp.App.Achievement.Series;
  /** 当前选中系列 ID，-1表示未选择 */
  cur: number;
  /** 是否隐藏已完成 */
  hideFin: boolean;
};
type TuaSeriesEmits = (e: "selected", v: number) => void;

let achiListener: UnlistenFn | null = null;
const props = defineProps<TuaSeriesProps>();
const emits = defineEmits<TuaSeriesEmits>();

const overview = shallowRef<TGApp.App.Achievement.Overview>({ fin: 0, total: 0 });
const progress = computed<number>(() => {
  if (overview.value.total === 0) return 0;
  return Math.round((overview.value.fin / overview.value.total) * 1000) / 10;
});
const showCard = computed<boolean>(() => {
  return props.series.card !== "";
});

onMounted(async () => {
  await refreshOverview();
  achiListener = await listenAchi();
});

watch(
  () => props.uid,
  async () => await refreshOverview(),
);

async function refreshOverview(): Promise<void> {
  overview.value = await TSUserAchi.getOverview(props.uid, props.series.id);
}

async function listenAchi(): Promise<UnlistenFn> {
  return await listen<number>("updateAchi", async (e: Event<number>) => {
    if (e.payload === props.series.id) await refreshOverview();
  });
}

onUnmounted(async () => {
  if (achiListener !== null) {
    achiListener();
    achiListener = null;
  }
});

function selectSeries(): void {
  emits("selected", props.series.id);
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tuas-card {
  @include github-styles.github-card;

  position: relative;
  display: flex;
  overflow: hidden;
  height: 60px;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
  color: var(--box-text-1);
  column-gap: 8px;
  cursor: pointer;

  &.tuas-selected {
    background: var(--box-bg-1);
  }

  &.tuas-radius {
    border-bottom-right-radius: 30px;
    border-top-right-radius: 30px;
  }

  &:hover {
    .tuas-reward {
      img {
        filter: unset;
      }
    }
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
  z-index: 3;
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

.tuas-reward {
  position: absolute;
  z-index: 0;
  top: -1px;
  right: -2px;
  height: 62px;

  img {
    height: 100%;
    filter: grayscale(1);
    object-fit: contain;
    opacity: 0.3;
    transition: filter 0.5s ease-in-out;

    &.finish {
      filter: unset;
    }
  }
}

.tuas-icon {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 5px;
  border-radius: 50%;
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
  position: relative;
  z-index: 1;
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
