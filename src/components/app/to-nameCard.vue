<!-- 名片详情浮窗 -->
<template>
  <TOverlay v-if="props.data" v-model="visible" :top-offset>
    <div class="ton-container">
      <slot name="left"></slot>
      <div :class="{ 'has-achievements': props.achievementSeries }" class="ton-box">
        <img
          v-if="props.data"
          :src="`/WIKI/nameCard/profile/${props.data.name}.webp`"
          alt="bg"
          class="ton-bg"
        />
        <div class="ton-surface">
          <div class="ton-content">
            <span>{{ props.data.name }}</span>
            <span>{{ parseNameCard(props.data.desc) }}</span>
            <span>{{ props.data.source }}</span>
          </div>
          <div :class="getNameCardTypeClass(props.data.type)" class="ton-type">
            {{ props.data.type }}
          </div>
          <div class="ton-sign">
            {{ props.achievementSeries ? "UID" : "ID" }}:{{
              props.achievementSeries?.uid ?? props.data.id
            }}
            | TeyvatGuide v{{ version }}
          </div>
          <section
            v-if="props.achievementSeries"
            class="ton-achievements"
            aria-label="系列成就完成状态"
          >
            <header class="ton-achievements-heading">
              <h3>{{ props.achievementSeries.name }}</h3>
              <span>{{ completedCount }}/{{ props.achievementSeries.items.length }}</span>
            </header>
            <v-progress-linear
              :modelValue="completionPercentage"
              color="var(--tgc-yellow-3)"
              height="4"
              rounded
              aria-label="系列成就完成进度"
            />
            <div ref="achievementGroupsRef" class="ton-achievement-groups">
              <section
                v-for="group in achievementGroups"
                :key="group.label"
                class="ton-achievement-group"
              >
                <h4 class="ton-achievement-group-title">{{ group.label }}</h4>
                <ul class="ton-achievements-list">
                  <li
                    v-for="item in group.items"
                    :key="item.achievement.id"
                    :data-achievement-id="item.achievement.id"
                    :title="item.achievement.description"
                    class="ton-achievement"
                  >
                    <img
                      :src="`/icon/achievement/UI_AchievementIcon_${item.stageCount}_${item.completedStageCount}.webp`"
                      :alt="group.label"
                      :class="{ 'is-unfinished': !item.isCompleted }"
                      class="ton-achievement-status"
                    />
                    <span class="ton-achievement-name">{{ item.achievement.name }}</span>
                    <span v-if="item.stageCount > 1" class="ton-achievement-stage">
                      {{ item.stageIndex }}/{{ item.stageCount }}
                    </span>
                  </li>
                </ul>
              </section>
            </div>
          </section>
          <v-btn
            :loading
            class="ton-share"
            data-html2canvas-ignore
            variant="outlined"
            @click="shareNameCard"
          >
            <v-icon>mdi-share-variant</v-icon>
            <span>分享</span>
          </v-btn>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { getVersion } from "@tauri-apps/api/app";
import TGShare from "@utils/TGShare.js";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";

import TOverlay from "./t-overlay.vue";

type ToNameCardProps = {
  data?: TGApp.App.NameCard.Item;
  topOffset?: string;
  achievementSeries?: {
    uid: number;
    name: string;
    items: Array<TGApp.App.Achievement.RenderItem>;
  };
};

type SeriesAchievement = {
  achievement: TGApp.App.Achievement.RenderItem;
  stageIndex: number;
  stageCount: number;
  completedStageCount: number;
  isCompleted: boolean;
};

const props = withDefaults(defineProps<ToNameCardProps>(), { topOffset: "0px" });
const visible = defineModel<boolean>();
const loading = ref<boolean>(false);
const version = ref<string>("");
const achievementGroupsRef = useTemplateRef<HTMLDivElement>("achievementGroupsRef");
const packingLayout = ref<{ width: number; gap: number; widths: Map<number, number> }>({
  width: 0,
  gap: 4,
  widths: new Map(),
});
const completedCount = computed<number>(
  () => props.achievementSeries?.items.filter((item) => item.isCompleted).length ?? 0,
);
const completionPercentage = computed<number>(() => {
  const total = props.achievementSeries?.items.length ?? 0;
  return total > 0 ? (completedCount.value / total) * 100 : 0;
});

const groupedAchievements = computed<Array<SeriesAchievement>>(() => {
  const items = props.achievementSeries?.items ?? [];
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const visited = new Set<number>();
  const result: Array<SeriesAchievement> = [];
  for (const item of items) {
    if (visited.has(item.id)) continue;
    const chain = TSUserAchi.getAchievementStageChain(item.id) ?? [item];
    const availableStages: Array<{
      achievement: TGApp.App.Achievement.RenderItem;
      stageIndex: number;
    }> = [];
    for (const [index, definition] of chain.entries()) {
      const achievement = itemMap.get(definition.id);
      if (achievement === undefined || visited.has(achievement.id)) continue;
      visited.add(achievement.id);
      availableStages.push({ achievement, stageIndex: index + 1 });
    }
    const currentStage =
      availableStages.find((stage) => !stage.achievement.isCompleted) ??
      availableStages[availableStages.length - 1];
    if (currentStage === undefined) continue;
    const firstUnfinishedIndex = chain.findIndex(
      (definition) => !itemMap.get(definition.id)?.isCompleted,
    );
    const isCompleted = firstUnfinishedIndex === -1;
    result.push({
      ...currentStage,
      stageCount: chain.length,
      completedStageCount: isCompleted ? chain.length : firstUnfinishedIndex,
      isCompleted,
    });
  }
  return result;
});
const achievementGroups = computed<Array<{ label: string; items: Array<SeriesAchievement> }>>(() =>
  [
    {
      label: "未完成",
      items: packAchievements(groupedAchievements.value.filter((item) => !item.isCompleted)),
    },
    {
      label: "已完成",
      items: packAchievements(groupedAchievements.value.filter((item) => item.isCompleted)),
    },
  ].filter((group) => group.items.length > 0),
);

watch(
  [achievementGroupsRef, groupedAchievements],
  ([element], _previous, onCleanup) => {
    if (element === null) return;
    let active = true;
    const measure = (): void => {
      const list = element.querySelector<HTMLElement>(".ton-achievements-list");
      if (list === null || list.clientWidth === 0) return;
      const scale = list.getBoundingClientRect().width / list.clientWidth;
      if (scale <= 0) return;
      const widths = new Map<number, number>();
      for (const item of element.querySelectorAll<HTMLElement>("[data-achievement-id]")) {
        widths.set(
          Number(item.dataset.achievementId),
          Math.ceil(item.getBoundingClientRect().width / scale),
        );
      }
      packingLayout.value = {
        width: list.clientWidth,
        gap: Number.parseFloat(getComputedStyle(list).columnGap) || 0,
        widths,
      };
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    void document.fonts.ready.then(() => {
      if (active) measure();
    });
    onCleanup(() => {
      active = false;
      observer.disconnect();
    });
  },
  { flush: "post" },
);

// 按实际宽度从长到短放入剩余空间最小的可容纳行，短项补齐前面行的空隙。
function packAchievements(items: Array<SeriesAchievement>): Array<SeriesAchievement> {
  const { width, gap, widths } = packingLayout.value;
  if (width <= 0 || items.some((item) => !widths.has(item.achievement.id))) return items;
  const rows: Array<{ items: Array<SeriesAchievement>; used: number }> = [];
  const sorted = [...items].sort(
    (left, right) =>
      (widths.get(right.achievement.id) ?? 0) - (widths.get(left.achievement.id) ?? 0),
  );
  for (const item of sorted) {
    const itemWidth = Math.min(widths.get(item.achievement.id) ?? width, width);
    let bestRow: (typeof rows)[number] | undefined;
    let smallestRemainder = Infinity;
    for (const row of rows) {
      const remainder = width - row.used - gap - itemWidth;
      if (remainder >= 0 && remainder < smallestRemainder) {
        bestRow = row;
        smallestRemainder = remainder;
      }
    }
    if (bestRow === undefined) {
      rows.push({ items: [item], used: itemWidth });
    } else {
      bestRow.items.push(item);
      bestRow.used += gap + itemWidth;
    }
  }
  return rows.flatMap((row) => row.items);
}

onMounted(async () => {
  version.value = await getVersion();
});

function getNameCardTypeClass(type: string): string {
  switch (type) {
    case "成就":
      return "achi";
    case "好感":
      return "fetter";
    case "活动":
      return "act";
    case "纪行":
      return "journey";
    case "声望":
      return "pop";
    default:
      return "default";
  }
}

function parseNameCard(desc: string): string {
  let array = [];
  if (desc.startsWith("名片纹饰。「") && desc.endsWith("」")) {
    array.push("名片纹饰。");
    const reg = /「.+?」/g;
    const match = desc.match(reg);
    if (match !== null) {
      for (const item of match) {
        if (item.length <= 34) {
          array.push(item);
          continue;
        }
        array.push("「");
        array.push(...parseDesc(item.slice(1, -1), true));
        const maxLength = Math.max(...array.map((item) => item.length));
        array.push("  ".repeat(maxLength - 4) + "」");
      }
    }
  } else {
    array.push("名片纹饰。");
    const content = desc.slice(5);
    if (content.length <= 32) array.push(content);
    else array.push(...parseDesc(content));
  }
  /* 布伦妮·制裁 */
  if (props?.data?.id === 210281) {
    const idx = desc.indexOf("」");
    const quotePart = desc.slice(0, idx + 1);
    const afterPart = desc.slice(idx + 1).trimStart();
    array = ["名片纹饰。"];
    const quoteContent = quotePart.match(/「(.+?)」/)?.[1];
    if (quoteContent) {
      array.push("「");
      array.push(...parseDesc(quoteContent, true));
      const maxLength = Math.max(...array.map((item) => item.length));
      array.push("  ".repeat(maxLength - 4) + "」");
    }
    array.push(afterPart);
  }
  const res = array.join("\n");
  if (!res.endsWith("\n")) return res + "\n";
  return res;
}

function parseDesc(desc: string, inQuote: boolean = false): Array<string> {
  let res = desc.replace(/。/g, "。\n");
  res = res.replace(/；/g, "；\n");
  /* 闲云·鹤云 */
  if (props?.data?.id !== 210187) {
    res = res.replace(/：/g, "：\n");
    res = res.replace(/？/g, "？\n");
  } else {
    res = res.replace("时候，", "时候，\n");
    res = res.replace("。\n」", "。」");
  }
  if (!desc.includes("！」")) res = res.replace(/！/g, "！\n");
  res = res.replace(/…/g, "…\n");
  res = res.replace(/…\n…/g, "……\n");
  /* 瓦雷莎·力源 */
  if (props?.data?.id === 210236) res = res.replace(/…\n/g, "…");
  /* 伊安珊·不懈 */
  if (props?.data?.id === 210237) {
    res = res.replace(/…\n/g, "…\n");
    res = res.replace(/」/g, "」\n");
  }
  if (
    /* 菲林斯·誓灯 */
    props?.data?.id === 210254 ||
    /* 杜林·曜心 */
    props?.data?.id === 210263 ||
    /* 雅珂达·帮手 */
    props?.data?.id === 210264
  ) {
    res = res.replace(/\n」/g, "」\n");
  }
  const match = res.split("\n");
  let array: Array<string> = [];
  for (const item of match) {
    if (item.length > 0 && item.length <= 32) {
      array.push(item);
      continue;
    }
    const match2 = item.replace(/，/g, "，\n").split("\n");
    match2.map((i) => (i.length > 0 ? array.push(i) : null));
  }
  if (inQuote) array = array.map((item) => `  ${item}`);
  return array;
}

async function shareNameCard(): Promise<void> {
  const nameCardBox = document.querySelector<HTMLElement>(".ton-box");
  if (nameCardBox === null) {
    showSnackbar.error("未找到名片内容");
    return;
  }
  const fileName = `【${props.data?.type}名片】-${props.data?.name}`;
  loading.value = true;
  try {
    await TGShare.modern(fileName, nameCardBox, 2.5);
  } finally {
    loading.value = false;
  }
}
</script>
<style lang="scss" scoped>
.ton-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.ton-box {
  position: relative;
  overflow: hidden;
  width: min(840px, calc(100vw - 160px));
  border: 1px solid #d1d1d1ff;
  border-radius: 12px;
  aspect-ratio: 21 / 10;
  box-shadow:
    0 8px 24px #0000003d,
    0 2px 8px #00000024;
}

.ton-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 12px;
}

.ton-surface {
  position: absolute;
  border-radius: 12px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: #00000040;
  inset: 0;
}

.ton-content {
  position: absolute;
  right: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8px;
  border-radius: 12px;
  color: var(--tgc-white-1);

  :first-child {
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    text-shadow: 0 0 5px #000000cc;
  }

  :nth-child(2) {
    border-bottom: 1px dotted var(--tgc-white-1);
    text-shadow: 0 0 2px #000000cc;
    white-space: pre-wrap;
  }

  :last-child {
    opacity: 0.8;
    text-shadow: 0 0 2px black;
  }
}

.dark .ton-box {
  border-color: #666666ff;
  box-shadow:
    0 8px 24px #0000007a,
    0 2px 8px #00000052;
}

.dark .ton-surface {
  background: #00000080;
}

.ton-type {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 14px;

  &.achi {
    border: 1px solid #4db6ac4d;
    background: #4db6ac2e;
    color: #4db6acff;
  }

  &.fetter {
    border: 1px solid #ba68c84d;
    background: #ba68c82e;
    color: #ba68c8ff;
  }

  &.act {
    border: 1px solid #81c7844d;
    background: #81c7842e;
    color: #81c784ff;
  }

  &.journey {
    border: 1px solid #64b5f64d;
    background: #64b5f62e;
    color: #64b5f6ff;
  }

  &.pop {
    border: 1px solid #e573734d;
    background: #e573732e;
    color: #e57373ff;
  }

  &.default {
    border: 1px solid #ffb74d4d;
    background: #ffb74d2e;
    color: #ffb74dff;
  }
}

.ton-sign {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--tgc-white-1);
  font-size: 12px;
}

.ton-share {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 4px;
  color: var(--tgc-white-1);
}

.ton-achievements {
  position: absolute;
  top: 40px;
  right: 12px;
  bottom: 56px;
  display: flex;
  width: 44%;
  min-width: 0;
  height: fit-content;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: var(--common-shadow-1);
  color: var(--tgc-white-1);
  gap: 4px;
}

.ton-achievements-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  h3 {
    margin: 0;
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    overflow-wrap: anywhere;
  }

  > span {
    flex-shrink: 0;
    color: var(--tgc-white-1);
    font-size: 12px;
  }
}

.ton-achievement-groups {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.ton-achievement-group {
  flex-shrink: 0;
}

.ton-achievement-group-title {
  display: flex;
  align-items: center;
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: normal;
  gap: 8px;

  &::after {
    height: 1px;
    flex: 1;
    background: var(--tgc-white-1);
    content: "";
    opacity: 0.3;
  }
}

.ton-achievements-list {
  display: flex;
  min-height: 0;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: flex-start;
  padding: 0;
  margin: 0;
  gap: 4px;
  list-style: none;
}

.ton-achievement {
  display: flex;
  min-width: 0;
  max-width: 100%;
  height: fit-content;
  align-items: center;
  padding: 0 4px;
  border-radius: 2px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-2);
  gap: 4px;
  line-height: 20px;
}

.ton-achievement-name {
  overflow: hidden;
  min-width: 0;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ton-achievement-status {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;

  &.is-unfinished {
    filter: grayscale(1);
  }
}

.ton-achievement-stage {
  height: 14px;
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 2px;
  background: #00000040;
  color: var(--tgc-od-red);
  font-size: 10px;
  line-height: 14px;
}

.ton-box.has-achievements {
  min-height: 400px;

  // .ton-content > span {
  //  max-width: 52%;
  //  overflow-wrap: anywhere;
  // }
}

@media (width <= 720px) {
  .ton-box.has-achievements {
    display: flex;
    max-height: calc(100vh - 144px);
    flex-direction: column;
    overflow-y: auto;

    .ton-bg {
      inset: 0;
      object-fit: cover;
    }

    .ton-surface {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 48px 12px 56px;
      gap: 16px;
    }

    .ton-content {
      position: relative;
      height: auto;
      flex-shrink: 0;
      padding: 8px;
    }

    .ton-content > span {
      max-width: 100%;
    }

    .ton-achievements {
      position: relative;
      top: auto;
      right: auto;
      bottom: auto;
      width: 100%;
      min-height: 200px;
      flex-shrink: 0;
    }

    .ton-achievement-groups {
      max-height: 240px;
    }
  }

  .ton-box {
    width: calc(100vw - 112px);
    min-height: min(440px, calc(100vh - 32px));
    aspect-ratio: auto;
  }
}
</style>
