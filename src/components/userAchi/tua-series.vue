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
        :src="`/WIKI/nameCard/bg/${nameCardName}.webp`"
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
    <button
      v-if="props.showHiddenFilter"
      :aria-label="hiddenFilterTitle"
      :title="hiddenFilterTitle"
      class="tuas-filter"
      type="button"
      @click.stop="switchHiddenFilter"
    >
      <v-icon :color="hiddenFilterColor" :icon="hiddenFilterIcon" size="20" />
    </button>
  </div>
</template>
<script lang="ts" setup>
import TSUserAchi from "@Sqlm/userAchi.js";
import { type Event, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, shallowRef, watch } from "vue";

import { AppNameCardsData } from "@/data/index.js";

type HiddenFilter = "all" | "hidden" | "visible";
type TuaSeriesProps = {
  /** 存档 UID */
  uid: number;
  /** 成就分类数据 */
  series: TGApp.App.Achievement.Category;
  /** 当前选中系列 ID，-1表示未选择 */
  cur: number;
  /** 是否隐藏已完成 */
  hideFin: boolean;
  /** 隐藏成就筛选状态 */
  hiddenFilter: HiddenFilter;
  /** 是否显示隐藏成就筛选入口 */
  showHiddenFilter: boolean;
};
type TuaSeriesEmits = {
  selected: [v: number];
  "switch-hidden-filter": [];
};

let achiListener: UnlistenFn | null = null;
const props = defineProps<TuaSeriesProps>();
const emits = defineEmits<TuaSeriesEmits>();

const overview = shallowRef<TGApp.App.Achievement.Overview>({ fin: 0, total: 0 });
const progress = computed<number>(() => {
  if (overview.value.total === 0) return 0;
  return Math.round((overview.value.fin / overview.value.total) * 1000) / 10;
});
const nameCardName = computed<string | undefined>(() => {
  if (props.series.namecardId === null) return undefined;
  return AppNameCardsData.find((item) => item.id === props.series.namecardId)?.name;
});
const showCard = computed<boolean>(() => nameCardName.value !== undefined);
const hiddenFilterIcon = computed<string>(() => {
  if (props.hiddenFilter === "hidden") return "mdi-eye-off-outline";
  if (props.hiddenFilter === "visible") return "mdi-eye-outline";
  return "mdi-eye-settings-outline";
});
const hiddenFilterColor = computed<string>(() => {
  if (props.hiddenFilter === "hidden") return "var(--tgc-od-orange)";
  if (props.hiddenFilter === "visible") return "var(--tgc-od-green)";
  return "var(--box-text-4)";
});
const hiddenFilterTitle = computed<string>(() => {
  if (props.hiddenFilter === "hidden") return "当前仅显示隐藏成就，点击切换为非隐藏成就";
  if (props.hiddenFilter === "visible") return "当前仅显示非隐藏成就，点击切换为全部成就";
  return "当前显示全部成就，点击切换为隐藏成就";
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

function switchHiddenFilter(): void {
  emits("switch-hidden-filter");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

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

.tuas-filter {
  position: relative;
  z-index: 2;
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: var(--common-shadow-1);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-2);
    outline-offset: 1px;
  }
}

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
    border-style: dashed;
    border-color: var(--tgc-od-orange);
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
    border-style: dashed;
    border-color: var(--tgc-od-orange);
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
