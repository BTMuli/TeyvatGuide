<!-- 角色WIKI详情 -->
<template>
  <div v-if="data !== undefined" class="twc-box">
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
    <TwcCostumes :costumes />
    <TwcSkills :data="data.skills" />
    <TwcConstellations :data="data.constellation" />
    <div class="twc-text-box">
      <div class="twc-text-top">
        <div class="twc-text-title">资料</div>
        <v-tabs v-model="talksTab" class="twc-text-tabs" density="compact">
          <v-tab
            v-for="(item, index) in data?.talks"
            :key="index"
            :value="index"
            class="twc-text-tab"
          >
            {{ item.group }}
          </v-tab>
        </v-tabs>
      </div>
      <v-window v-model="talksTab" :transition="false" class="twc-text-window">
        <v-window-item
          v-for="(item, index) in data?.talks"
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
    </div>
    <div class="twc-text-box">
      <div class="twc-text-top">
        <div class="twc-text-title">故事</div>
        <v-tabs v-model="storiesTab" class="twc-text-tabs" density="compact">
          <v-tab
            v-for="(item, index) in data?.stories"
            :key="index"
            :value="index"
            class="twc-text-tab"
          >
            {{ item.Title }}
          </v-tab>
        </v-tabs>
      </div>
      <v-window v-model="storiesTab" :transition="false" class="twc-text-window">
        <v-window-item
          v-for="(item, index) in data?.stories"
          :key="index"
          :value="index"
          class="twc-text-content"
        >
          <span>{{ item.Context }}</span>
        </v-window-item>
      </v-window>
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
import { computed, onMounted, ref, shallowRef, watch } from "vue";
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
  size: "100px",
  height: "100px",
  display: "inner",
  lt: `/icon/element/${data.value?.element ?? "风"}元素.webp`,
  ltSize: "25px",
  innerText: "",
  innerIcon: `/icon/weapon/${data.value?.weapon}.webp`,
  clickable: false,
}));

const talksTab = ref<number>(0);
const storiesTab = ref<number>(0);

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
  flex-direction: column;
  margin: 0 auto;
  row-gap: 8px;
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

.twc-text-box {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  gap: 8px;
}

.twc-text-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.twc-text-title {
  padding: 0 4px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  line-height: 22px;
  white-space: pre;
}

.twc-text-window {
  min-height: 0;
}

.twc-text-window-item {
  display: flex;
  max-height: 360px;
  flex-direction: column;
  padding-right: 4px;
  overflow-y: auto;
  row-gap: 8px;
}

.twc-text-talk {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
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
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
