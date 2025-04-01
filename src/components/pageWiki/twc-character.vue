<template>
  <div class="twc-box" v-if="data !== undefined">
    <div class="twc-brief">
      <TItembox :model-value="box" />
      <div class="twc-brief-info">
        <div class="twc-bi-top">
          <div class="twc-bi-title">
            <span>{{ data.name }}</span>
            <span>{{ data.title }}</span>
            <img
              title="前往观测枢"
              alt="observer"
              @click="toWiki()"
              v-if="props.item.contentId !== 0"
              src="/platforms/mhy/observer.webp"
            />
          </div>
          <div class="twc-bi-desc">{{ data.description }}</div>
        </div>
        <div class="twc-bi-grid1">
          <div class="twc-big-item">
            <span>所属</span>
            <span>{{ data.brief.camp }}</span>
          </div>
          <div class="twc-big-item">
            <span>命之座</span>
            <span>{{ data.brief.constellation }}</span>
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
        <div class="twc-bi-grid2">
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
    <TopNameCard :data="nameCard" @selected="showNc = !showNc" v-if="nameCard" />
    <TwcMaterials :data="data.materials" />
    <TwcSkills :data="data.skills" />
    <TwcConstellations :data="data.constellation" />
    <v-expansion-panels class="twc-text-item">
      <v-expansion-panel>
        <template #title><span class="twc-text-title">资料</span></template>
        <template #text>
          <v-expansion-panels variant="popout">
            <v-expansion-panel
              expand-icon="mdi-menu-down"
              v-for="(item, index) in data?.talks"
              :key="index"
            >
              <template #title>
                <span class="twc-text-item-title">{{ item.Title }}</span>
              </template>
              <template #text>
                <span class="twc-text-item-content" v-html="parseHtmlText(item.Context)" />
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-expansion-panel>
      <v-expansion-panel>
        <template #title><span class="twc-text-title">故事</span></template>
        <template #text>
          <v-expansion-panels variant="popout">
            <v-expansion-panel
              expand-icon="mdi-menu-down"
              v-for="(item, index) in data.stories"
              :key="index"
            >
              <template #title>
                <span class="twc-text-item-title">{{ item.Title }}</span>
              </template>
              <template #text>
                <span class="twc-text-item-content">{{ item.Context }}</span>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
    <ToNameCard v-if="hasNc" v-model="showNc" :data="nameCard" />
  </div>
</template>
<script setup lang="ts">
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

import TwcConstellations from "./twc-constellations.vue";
import TwcMaterials from "./twc-materials.vue";
import TwcSkills from "./twc-skills.vue";

import { AppCharacterData, AppNameCardsData, WikiCharacterData } from "@/data/index.js";
import { createObc } from "@/utils/TGWindow.js";
import { parseHtmlText } from "@/utils/toolFunc.js";

type TwcCharacterProps = { item: TGApp.App.Character.WikiBriefInfo };

const props = defineProps<TwcCharacterProps>();
const router = useRouter();

const hasNc = ref<boolean>(false);
const showNc = ref<boolean>(false);
const nameCard = shallowRef<TGApp.App.NameCard.Item>();
const data = shallowRef<TGApp.App.Character.WikiItem>();
const box = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${data.value?.star ?? 5}-Star.webp`,
  icon: `/WIKI/character/${data.value?.id ?? 10000005}.webp`,
  size: "128px",
  height: "128px",
  display: "inner",
  lt: `/icon/element/${data.value?.element ?? "风"}元素.webp`,
  ltSize: "30px",
  innerHeight: 30,
  innerIcon: `/icon/weapon/${data.value?.weapon}.webp`,
  innerText: data.value?.name ?? "旅行者",
  clickable: false,
}));

onMounted(() => loadData());

watch(() => props.item, loadData);

function loadData(): void {
  const res = WikiCharacterData.find((item) => item.id === props.item.id);
  if (res === undefined) {
    showSnackbar.warn(`未获取到角色 ${props.item.name} 的 Wiki 数据`);
    return;
  }
  data.value = res;
  const appC = AppCharacterData.find((i) => i.name === data.value?.name);
  if (appC !== undefined) {
    hasNc.value = true;
    nameCard.value = AppNameCardsData.find((i) => i.name === appC.nameCard);
  } else hasNc.value = false;
  showSnackbar.success(`成功获取角色 ${props.item.name} 的 Wiki 数据`);
}

async function toWiki(): Promise<void> {
  if (props.item.contentId === 0) {
    showSnackbar.warn(`角色 ${props.item.name} 暂无详情`);
    return;
  }
  await createObc(props.item.contentId, props.item.name);
}

async function toBirth(date: string): Promise<void> {
  const birth = date.replace("月", "/").replace("日", "");
  await router.push({ name: "留影叙佳期", params: { date: birth } });
}
</script>
<style lang="css" scoped>
:deep(.v-expansion-panel-title) {
  background: var(--common-shadow-1);
}

.twc-box {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 10px;
}

.twc-brief {
  display: flex;
  align-items: flex-start;
  column-gap: 10px;
}

.twc-brief-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.twc-bi-top {
  display: flex;
  flex-direction: column;
}

.twc-bi-title {
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

.twc-bi-title :last-child {
  cursor: pointer;
}

.twc-bi-desc {
  display: flex;
  align-items: flex-end;
  font-size: 14px;
  opacity: 0.8;
}

.twc-bi-grid1 {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}

.twc-bi-grid2 {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.twc-big-item {
  display: flex;
  column-gap: 5px;
}

.twc-big-item.active {
  cursor: pointer;
}

.twc-big-item :nth-child(1) {
  font-weight: bold;
}

.twc-text-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.twc-text-item {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.twc-text-item-title {
  font-weight: bold;
}

.twc-text-item-content {
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
