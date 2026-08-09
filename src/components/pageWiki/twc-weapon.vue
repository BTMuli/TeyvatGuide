<!-- 武器WIKI详情 -->
<template>
  <div v-if="data" class="tww-box">
    <div class="tww-summary">
      <div class="tww-overview">
        <div class="tww-brief">
          <TItemBox :model-value="box" />
          <div class="tww-brief-info">
            <div class="tww-brief-title-row">
              <div class="tww-brief-title">
                <span>{{ data.name }}</span>
                <img
                  v-if="props.item.contentId !== 0"
                  alt="observer"
                  src="/platforms/mhy/observer.webp"
                  title="前往观测枢"
                  @click="toWiki()"
                />
              </div>
              <div class="tww-quick-switches">
                <v-btn-toggle
                  :model-value="isAscensionLevel(level) ? level : undefined"
                  aria-label="快速选择突破临界等级"
                  class="tww-level-nodes"
                  density="compact"
                  mandatory
                  @update:model-value="selectAscensionLevel"
                >
                  <v-btn
                    v-for="option in ascensionLevelOptions"
                    :key="option"
                    :title="`跳转至 ${option} 级突破节点`"
                    :value="option"
                    size="x-small"
                    variant="text"
                  >
                    {{ option }}
                  </v-btn>
                </v-btn-toggle>
                <v-btn-toggle
                  v-if="data.affix"
                  v-model="select"
                  aria-label="选择精炼等级"
                  class="tww-refinement-toggle"
                  density="compact"
                  mandatory
                >
                  <v-btn
                    v-for="(_, index) in selectItems"
                    :key="index"
                    :title="`跳转至 ${index + 1} 级精炼效果`"
                    :value="index + 1"
                    class="tww-refinement-btn"
                    size="x-small"
                    variant="text"
                  >
                    R{{ index + 1 }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </div>
            <div class="tww-brief-meta">
              <span>{{ data.weapon }}</span>
              <span>{{ data.star }} 星武器</span>
            </div>
            <div class="tww-brief-desc">{{ data.description }}</div>
          </div>
        </div>
        <aside aria-label="武器属性" class="tww-properties">
          <div class="tww-stat-list">
            <div v-for="stat in weaponStats" :key="stat.type" class="tww-stat">
              <div class="tww-stat-copy">
                <span class="tww-stat-kind">{{ stat.type === 4 ? "主属性" : "副属性" }}</span>
                <span class="tww-stat-name">{{ stat.info.name }}</span>
              </div>
              <div class="tww-stat-value">
                <strong :class="{ comparison: hasStatComparison(stat) }">
                  {{ formatWeaponStat(stat) }}
                </strong>
              </div>
            </div>
          </div>
          <UcLevelSlider v-model="level" :current="1" :max="maxLevel" compact single />
        </aside>
      </div>
      <PwMaterialList :data="data.materials" />
    </div>
    <v-divider />
    <div ref="scrollArea" class="tww-scroll">
      <section v-if="data.affix" class="tww-section">
        <header class="tww-section-header">
          <div class="tww-section-heading">
            <span>武器效果 · 精炼 {{ select }}</span>
            <h2>{{ data.affix.Name }}</h2>
          </div>
        </header>
        <div
          class="tww-text-content"
          v-html="parseHtmlText(data.affix.Descriptions[select - 1].Description)"
        />
      </section>
      <section class="tww-section">
        <header class="tww-section-header">
          <div class="tww-section-heading">
            <span>背景资料</span>
            <h2>故事</h2>
          </div>
          <v-tabs
            v-if="data.story.length > 1"
            v-model="storyTab"
            class="tww-story-tabs"
            density="compact"
          >
            <v-tab v-for="(_, index) in data.story" :key="index" :value="index">
              故事 {{ index + 1 }}
            </v-tab>
          </v-tabs>
        </header>
        <v-window v-model="storyTab" :transition="false">
          <v-window-item
            v-for="(story, index) in data.story"
            :key="index"
            :value="index"
            class="tww-text-content"
          >
            {{ parseHtmlText(story) }}
          </v-window-item>
        </v-window>
      </section>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import UcLevelSlider from "@comp/userCalc/uc-level-slider.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import {
  ASCENSION_LEVELS,
  getWeaponMaxLevel,
  isAscensionLevel,
  resolvePromoteLevel,
} from "@utils/userCalc.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import PwMaterialList from "./pw-material-list.vue";

import { wwWeapon } from "@/data/index.js";

type TwcWeaponProps = { item: TGApp.App.Weapon.WikiBriefInfo };

const props = defineProps<TwcWeaponProps>();

const data = shallowRef<TGApp.App.Weapon.WikiItem>();
const box = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${data.value?.star}-Star.webp`,
  icon: `/WIKI/weapon/${data.value?.id}.webp`,
  size: "100px",
  height: "100px",
  display: "inner",
  lt: `/icon/weapon/${data.value?.weapon}.webp`,
  ltSize: "25px",
  innerHeight: 0,
  innerText: "",
  clickable: false,
}));
const select = ref<number>(1);
const storyTab = ref<number>(0);
const level = ref<number>(90);
const selectItems = shallowRef<Array<number>>([]);
const scrollArea = useTemplateRef<HTMLDivElement>("scrollArea");
const maxLevel = computed<number>(() => getWeaponMaxLevel(data.value?.star ?? 5));
const ascensionLevelOptions = computed<Array<number>>(() =>
  ASCENSION_LEVELS.filter((item) => item < maxLevel.value),
);
const canCompareAscension = computed<boolean>(
  () => level.value < maxLevel.value && isAscensionLevel(level.value),
);
const beforePromoteLevel = computed<number>(() =>
  resolvePromoteLevel(level.value, undefined, canCompareAscension.value ? false : undefined),
);
const afterPromoteLevel = computed<number>(() =>
  resolvePromoteLevel(level.value, undefined, canCompareAscension.value ? true : undefined),
);
const weaponStats = computed<Array<TGApp.App.Weapon.WeaponProp>>(() =>
  data.value === undefined
    ? []
    : wikiUtils.weapon(data.value, level.value, beforePromoteLevel.value),
);
const afterWeaponStats = computed<Array<TGApp.App.Weapon.WeaponProp>>(() =>
  data.value === undefined
    ? []
    : wikiUtils.weapon(data.value, level.value, afterPromoteLevel.value),
);

async function loadData(): Promise<void> {
  const res = wwWeapon.find((item) => item.id === props.item.id);
  if (res === undefined) {
    showSnackbar.warn(`未获取到武器 ${props.item.name} 的 Wiki 数据`);
    return;
  }
  data.value = res;
  select.value = 1;
  storyTab.value = 0;
  level.value = getWeaponMaxLevel(res.star);
  selectItems.value = res.affix?.Descriptions.map((item) => item.Level) ?? [];
  await nextTick();
  scrollArea.value?.scrollTo({ top: 0 });
  showSnackbar.success(`成功获取武器 ${props.item.name} 的 Wiki 数据`);
}

watch(() => props.item, loadData);

onMounted(() => loadData());

function selectAscensionLevel(value: number): void {
  level.value = value;
}

function formatWeaponStat(stat: TGApp.App.Weapon.WeaponProp): string {
  const beforeValue = wikiUtils.propFmt(stat.type, stat.val);
  const afterValue = getAfterStatValue(stat);
  if (afterValue === undefined) return beforeValue;
  return `${beforeValue}（${afterValue}）`;
}

function hasStatComparison(stat: TGApp.App.Weapon.WeaponProp): boolean {
  return getAfterStatValue(stat) !== undefined;
}

function getAfterStatValue(stat: TGApp.App.Weapon.WeaponProp): string | undefined {
  if (!canCompareAscension.value) return undefined;
  const afterStat = afterWeaponStats.value.find((item) => item.type === stat.type);
  if (afterStat === undefined) return undefined;
  const beforeValue = wikiUtils.propFmt(stat.type, stat.val);
  const afterValue = wikiUtils.propFmt(afterStat.type, afterStat.val);
  return beforeValue === afterValue ? undefined : afterValue;
}

async function toWiki(): Promise<void> {
  if (props.item.contentId === 0) {
    showSnackbar.warn(`武器 ${props.item.name} 暂无详情`);
    return;
  }
  await toObcPage(props.item.contentId);
}
</script>
<style lang="scss" scoped>
.tww-box {
  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 8px;
}

.tww-summary {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
}

.tww-overview {
  display: grid;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: minmax(460px, 1.35fr) minmax(240px, 0.65fr);
}

.tww-scroll {
  display: flex;
  overflow: hidden auto;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.tww-brief {
  display: flex;
  box-sizing: border-box;
  align-items: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  column-gap: 8px;
}

.tww-properties {
  display: flex;
  min-width: 0;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.tww-stat-list {
  display: grid;
  min-height: 42px;
  flex: 0 0 42px;
  gap: 4px;
  grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
}

.tww-stat {
  display: flex;
  min-width: 0;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--app-page-bg);
  gap: 4px;
}

.tww-stat-copy,
.tww-stat-value {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}

.tww-stat-copy {
  align-items: flex-start;
}

.tww-stat-value {
  height: 100%;
  flex-shrink: 0;
  align-items: flex-end;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 18px;
    white-space: nowrap;

    &.comparison {
      font-size: 12px;
    }
  }
}

.tww-stat-name {
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
}

.tww-stat-kind {
  color: var(--tgc-od-blue);
  font-size: 9px;
  line-height: 12px;

  .tww-stat.primary & {
    color: var(--tgc-yellow-1);
  }
}

.tww-level-nodes {
  width: fit-content;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-1);
  gap: 1px;

  :deep(.v-btn) {
    min-width: 24px;
    flex: none;
    padding: 0 4px;
    background: var(--box-bg-4);
    color: var(--box-text-2);
    font-size: 9px;
    letter-spacing: 0;
  }

  :deep(.v-btn--active) {
    background: var(--tgc-btn-1);
    color: var(--btn-text);
  }
}

.tww-brief-info {
  display: flex;
  min-width: 0;
  height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.tww-brief-title-row {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
}

.tww-quick-switches {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  gap: 4px;
}

.tww-brief-title {
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;
  line-height: 26px;

  img {
    width: 20px;
    height: 20px;
    cursor: pointer;
    object-fit: contain;
  }
}

.tww-brief-meta {
  display: flex;
  color: var(--box-text-4);
  column-gap: 12px;
  font-size: 12px;
  line-height: 16px;
}

.tww-brief-desc {
  overflow: hidden;
  max-height: 40px;
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
}

.tww-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 4px;
}

.tww-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tww-section-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;

  > span {
    color: var(--box-text-4);
    font-size: 10px;
    line-height: 14px;
  }

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tww-refinement-toggle {
  height: 20px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-1);
  gap: 1px;
}

.tww-refinement-btn {
  min-width: 24px;
  padding: 0 4px;
  background: var(--box-bg-4);
  color: var(--box-text-2);
  font-size: 9px;
  letter-spacing: 0;

  &.v-btn--active {
    background: var(--tgc-btn-1);
    color: var(--btn-text);
  }
}

.tww-story-tabs {
  min-width: 0;
}

.tww-text-content {
  color: var(--box-text-2);
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (width <= 980px) {
  .tww-overview {
    grid-template-columns: 1fr;
  }
}

@media (width <= 560px) {
  .tww-brief {
    height: auto;
    flex-wrap: wrap;
  }
}
</style>
