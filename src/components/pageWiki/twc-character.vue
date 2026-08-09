<!-- 角色WIKI详情 -->
<template>
  <div v-if="data !== undefined" class="twc-box">
    <div class="twc-summary">
      <div class="twc-brief">
        <TItembox :model-value="box" />
        <div class="twc-brief-info">
          <div class="twc-bi-top">
            <div class="twc-bi-title">
              <span>{{ data.name }}</span>
              <span>{{ data.title }}</span>
              <img
                v-if="props.item.contentId !== 0"
                alt="observer"
                src="/platforms/mhy/observer.webp"
                title="前往观测枢"
                @click="toWiki()"
              />
            </div>
            <div class="twc-bi-desc">{{ data.description }}</div>
          </div>
          <div class="twc-bi-grid">
            <div class="twc-big-item">
              <span>{{ data.elePrefix }}</span>
              <span>{{ data.element }}</span>
            </div>
            <div class="twc-big-item">
              <span>命之座</span>
              <span>{{ data.brief.constellation }}</span>
            </div>
            <div class="twc-big-item">
              <span>所属</span>
              <span>
                {{ data.area === data.brief.camp ? data.area : `${data.area}·${data.brief.camp}` }}
              </span>
            </div>
            <div
              class="twc-big-item active"
              title="点击查看生日画片"
              @click="toBirth(data.brief.birth)"
            >
              <span>生日</span>
              <span>{{ data.brief.birth }}</span>
            </div>
          </div>
          <div class="twc-bi-grid">
            <div class="twc-big-item">
              <span>汉语CV</span>
              <span>{{ data.brief.cv.cn }}</span>
            </div>
            <div class="twc-big-item">
              <span>日语CV</span>
              <span>{{ data.brief.cv.jp }}</span>
            </div>
            <div class="twc-big-item">
              <span>英语CV</span>
              <span>{{ data.brief.cv.en }}</span>
            </div>
            <div class="twc-big-item">
              <span>韩语CV</span>
              <span>{{ data.brief.cv.kr }}</span>
            </div>
          </div>
        </div>
      </div>
      <TopNameCard v-if="nameCard" :data="nameCard" @selected="showNc = !showNc" />
      <PwMaterialList :data="data.materials" />
    </div>
    <div ref="scrollArea" class="twc-scroll">
      <!-- 衣装 -->
      <section class="twc-detail-section">
        <header class="twc-section-header">
          <h2>衣装</h2>
        </header>
        <TwcCostumes :costumes />
      </section>
      <!-- 天赋 -->
      <section class="twc-detail-section">
        <header class="twc-section-header">
          <h2>天赋</h2>
          <div v-if="currentTalent" class="twc-section-current">
            <img
              :src="`/icon/constellations/${currentTalent.Icon}.webp`"
              alt=""
              aria-hidden="true"
            />
            <span>{{ currentTalent.Name }}</span>
          </div>
        </header>
        <TwcConstellations v-model:selected="selectedTalent" :data="data.constellation" />
      </section>
      <!-- 技能 -->
      <section class="twc-detail-section">
        <header class="twc-section-header">
          <h2>技能</h2>
          <div v-if="currentSkill" class="twc-section-current">
            <img :src="`/icon/talents/${currentSkill.icon}.webp`" alt="" aria-hidden="true" />
            <span>{{ currentSkill.name }}</span>
          </div>
        </header>
        <TwcSkills v-model:selected="selectedSkill" :data="data.skills" />
      </section>
      <!-- 资料 -->
      <section class="twc-detail-section">
        <header class="twc-section-header">
          <h2>资料</h2>
        </header>
        <v-tabs v-model="talksTab" class="twc-detail-tabs" density="compact" show-arrows>
          <v-tab v-for="(item, index) in data.talks" :key="index" :value="index">
            {{ item.group }}
          </v-tab>
        </v-tabs>
        <v-window v-model="talksTab" :transition="false" class="twc-text-window">
          <v-window-item
            v-for="(item, index) in data.talks"
            :key="index"
            :value="index"
            class="twc-text-window-item"
          >
            <div v-for="(talk, talkIndex) in item.list" :key="talkIndex" class="twc-text-talk">
              <div class="twc-text-talk-title">{{ talk.title }}</div>
              <div class="twc-text-talk-content">
                <span v-html="parseHtmlText(talk.talk)" />
              </div>
            </div>
          </v-window-item>
        </v-window>
      </section>
      <!-- 故事 -->
      <section class="twc-detail-section">
        <header class="twc-section-header">
          <h2>故事</h2>
        </header>
        <v-tabs v-model="storiesTab" class="twc-detail-tabs" density="compact" show-arrows>
          <v-tab v-for="(item, index) in data.stories" :key="index" :value="index">
            {{ item.Title }}
          </v-tab>
        </v-tabs>
        <v-window v-model="storiesTab" :transition="false" class="twc-text-window">
          <v-window-item
            v-for="(item, index) in data.stories"
            :key="index"
            :value="index"
            class="twc-text-content"
          >
            <span>{{ item.Context }}</span>
          </v-window-item>
        </v-window>
      </section>
    </div>
    <ToNameCard v-if="hasNc" v-model="showNc" :data="nameCard" />
  </div>
</template>
<script lang="ts" setup>
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TwcCostumes from "@comp/pageWiki/twc-costumes.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import PwMaterialList from "./pw-material-list.vue";
import TwcConstellations from "./twc-constellations.vue";
import TwcSkills from "./twc-skills.vue";

import { AppCharacterData, AppNameCardsData, getWikiCharacterById } from "@/data/index.js";

type TwcCharacterProps = { item: TGApp.App.Character.WikiBriefInfo };

const props = defineProps<TwcCharacterProps>();
const router = useRouter();

const hasNc = ref<boolean>(false);
const showNc = ref<boolean>(false);
const nameCard = shallowRef<TGApp.App.NameCard.Item>();
const data = shallowRef<TGApp.App.Character.WikiItem>();
const costumes = shallowRef<Array<TGApp.App.Character.Costume>>([]);
const box = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${data.value?.star ?? 5}-Star.webp`,
  icon: `/WIKI/character/${data.value?.id ?? 10000005}.webp`,
  size: "120px",
  height: "120px",
  display: "inner",
  lt: `/icon/element/${data.value?.element ?? "风"}元素.webp`,
  ltSize: "25px",
  innerText: "",
  innerIcon: `/icon/weapon/${data.value?.weapon}.webp`,
  clickable: false,
}));

const talksTab = ref<number>(0);
const storiesTab = ref<number>(0);
const selectedTalent = ref<string>("");
const selectedSkill = ref<string>("");
const scrollArea = useTemplateRef<HTMLDivElement>("scrollArea");
const currentTalent = computed<TGApp.Plugins.Hutao.Character.RhisdTalent | undefined>(() =>
  data.value?.constellation.find((item) => item.Name === selectedTalent.value),
);
const currentSkill = computed<TGApp.App.Character.WikiSkill | undefined>(() =>
  data.value?.skills.find((item) => item.name === selectedSkill.value),
);

onMounted(() => loadData());

watch(() => props.item, loadData);

async function loadData(): Promise<void> {
  const res = await getWikiCharacterById(props.item.id);
  if (!res) {
    showSnackbar.warn(`未获取到角色 ${props.item.name} 的 Wiki 数据`);
    return;
  }
  data.value = res;
  talksTab.value = 0;
  storiesTab.value = 0;
  const appC = AppCharacterData.find((i) => i.name === data.value?.name);
  if (appC !== undefined) {
    hasNc.value = true;
    nameCard.value = AppNameCardsData.find((i) => i.name === appC.nameCard);
    costumes.value = appC.costumes.sort((a, b) => a.id - b.id);
  } else hasNc.value = false;
  await nextTick();
  scrollArea.value?.scrollTo({ top: 0 });
  showSnackbar.success(`成功获取角色 ${props.item.name} 的 Wiki 数据`);
}

async function toWiki(): Promise<void> {
  if (props.item.contentId === 0) {
    showSnackbar.warn(`角色 ${props.item.name} 暂无详情`);
    return;
  }
  await toObcPage(props.item.contentId);
}

async function toBirth(date: string): Promise<void> {
  const birth = date.replace("月", "/").replace("日", "");
  await router.push({ name: "留影叙佳期", params: { date: birth } });
}
</script>
<style lang="scss" scoped>
.twc-box {
  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 12px;
}

.twc-summary {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
}

.twc-scroll {
  display: flex;
  overflow: hidden auto;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.twc-brief {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  column-gap: 12px;
}

.twc-brief-info {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100px;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
}

.twc-bi-top {
  display: flex;
  flex-direction: column;
}

.twc-bi-title {
  position: relative;
  display: flex;
  width: fit-content;
  flex-wrap: wrap;
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

.twc-bi-title :last-child {
  cursor: pointer;
}

.twc-bi-desc {
  display: flex;
  align-items: flex-end;
  font-size: 14px;
  opacity: 0.8;
}

.twc-bi-grid {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.twc-big-item {
  display: flex;
  column-gap: 4px;
}

.twc-big-item.active {
  cursor: pointer;
}

.twc-big-item :nth-child(1) {
  font-weight: bold;
}

.twc-detail-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.twc-section-header {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.twc-section-current {
  display: flex;
  min-width: 0;
  align-items: center;
  color: var(--box-text-2);
  column-gap: 8px;
  font-size: 14px;
  line-height: 20px;

  img {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    filter: var(--icon-filter);
    object-fit: contain;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

:deep(.twc-detail-tabs) {
  width: 100%;
  min-width: 0;
  border-bottom: 1px solid var(--common-shadow-1);
}

:deep(.twc-detail-tabs .v-tab) {
  min-width: 64px;
  padding: 0 12px;
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  letter-spacing: 0;
  text-transform: none;
}

:deep(.twc-icon-tabs .v-tab) {
  min-width: 40px;
  padding: 0 8px;
}

.twc-text-window {
  min-height: 0;
}

.twc-text-window-item {
  display: flex;
  flex-direction: column;
  padding-right: 4px;
  row-gap: 8px;
}

.twc-text-talk {
  display: flex;
  flex-direction: column;
  row-gap: 4px;
}

.twc-text-talk-title {
  font-family: var(--font-title);
  font-size: 14px;
}

.twc-text-talk-content {
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twc-text-content {
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
