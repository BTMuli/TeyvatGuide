<!-- 武器WIKI详情 -->
<template>
  <div v-if="data" class="tww-box">
    <div class="tww-summary">
      <div class="tww-brief">
        <TItemBox :model-value="box" />
        <div class="tww-brief-info">
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
          <div class="tww-brief-meta">
            <span>{{ data.weapon }}</span>
            <span>{{ data.star }} 星武器</span>
          </div>
          <div class="tww-brief-desc">{{ data.description }}</div>
        </div>
      </div>
      <PwMaterialList :data="data.materials" />
    </div>
    <div ref="scrollArea" class="tww-scroll">
      <section v-if="data.affix" class="tww-section">
        <header class="tww-section-header">
          <div class="tww-section-heading">
            <span>武器效果</span>
            <h2>{{ data.affix.Name }}</h2>
          </div>
          <div class="tww-refinement">
            <span>精炼 {{ select }}</span>
            <v-btn-toggle
              v-model="select"
              aria-label="选择精炼等级"
              class="tww-refinement-toggle"
              density="compact"
              mandatory
            >
              <v-btn
                v-for="(_, index) in selectItems"
                :key="index"
                :value="index + 1"
                class="tww-refinement-btn"
                size="x-small"
                variant="text"
              >
                R{{ index + 1 }}
              </v-btn>
            </v-btn-toggle>
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
import { toObcPage } from "@utils/TGWindow.js";
import { parseHtmlText } from "@utils/toolFunc.js";
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
const selectItems = shallowRef<Array<number>>([]);
const scrollArea = useTemplateRef<HTMLDivElement>("scrollArea");

async function loadData(): Promise<void> {
  const res = wwWeapon.find((item) => item.id === props.item.id);
  if (res === undefined) {
    showSnackbar.warn(`未获取到武器 ${props.item.name} 的 Wiki 数据`);
    return;
  }
  data.value = res;
  select.value = 1;
  storyTab.value = 0;
  selectItems.value = res.affix?.Descriptions.map((item) => item.Level) ?? [];
  await nextTick();
  scrollArea.value?.scrollTo({ top: 0 });
  showSnackbar.success(`成功获取武器 ${props.item.name} 的 Wiki 数据`);
}

watch(() => props.item, loadData);

onMounted(() => loadData());

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
  row-gap: 12px;
}

.tww-summary {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
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
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  column-gap: 12px;
}

.tww-brief-info {
  display: flex;
  min-height: 100px;
  flex: 1;
  flex-direction: column;
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

.tww-refinement {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  column-gap: 8px;
  font-size: 12px;
}

.tww-refinement-toggle {
  height: 28px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
}

.tww-refinement-btn {
  min-width: 32px;
  color: var(--box-text-2);

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
</style>
