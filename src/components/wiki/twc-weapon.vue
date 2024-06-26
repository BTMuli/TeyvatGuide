<template>
  <div class="tww-box" v-if="data !== undefined">
    <div class="tww-brief">
      <TItembox :model-value="box" />
      <div class="tww-brief-info">
        <div class="tww-brief-title">
          <span>{{ data.name }}</span>
          <span @click="toWiki()"><v-icon>mdi-link</v-icon></span>
        </div>
        <v-rating
          v-if="data.affix"
          class="tww-brief-rating"
          v-model="select"
          :length="selectItems.length"
          :size="24"
          dense
        />
        <div class="tww-brief-desc">{{ data.description }}</div>
      </div>
    </div>
    <TwcMaterials :data="data.materials" />
    <v-expansion-panels class="tww-affix" v-if="data.affix">
      <v-expansion-panel expand-icon="mdi-menu-down">
        <template #title>
          <span class="tww-text-title">{{ data.affix.Name }}-精炼 {{ select }}</span>
        </template>
        <template #text>
          <span
            class="tww-text-content"
            v-html="parseHtmlText(data.affix.Descriptions[select - 1].Description)"
          />
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-expansion-panels class="tww-story">
      <v-expansion-panel
        expand-icon="mdi-menu-down"
        v-for="(story, index) in data.story"
        :key="index"
      >
        <template #title>
          <span class="tww-text-title">
            {{ data.story.length > 1 ? `故事 ${index + 1}` : "故事" }}
          </span>
        </template>
        <template #text>
          <span class="tww-text-content">{{ parseHtmlText(story) }}</span>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import { WikiWeaponData } from "../../data/index.js";
import Mys from "../../plugins/Mys/index.js";
import { createTGWindow } from "../../utils/TGWindow.js";
import { parseHtmlText } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

import TwcMaterials from "./twc-materials.vue";

interface TwcWeaponProps {
  item: TGApp.App.Weapon.WikiBriefInfo;
}

const props = defineProps<TwcWeaponProps>();

const data = ref<TGApp.App.Weapon.WikiItem>();
const box = computed(() => {
  return <TItemBoxData>{
    bg: `/icon/bg/${data.value?.star}-Star.webp`,
    icon: `/WIKI/weapon/${data.value?.id}.webp`,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: `/icon/weapon/${data.value?.weapon}.webp`,
    ltSize: "40px",
    innerHeight: 0,
    clickable: false,
  };
});
const select = ref<number>(1);
const selectItems = ref<number[]>([]);

async function loadData(): Promise<void> {
  const res = WikiWeaponData.find((item) => item.id === props.item.id);
  if (res === undefined) {
    showSnackbar({
      text: `未获取到武器 ${props.item.name} 的 Wiki 数据`,
      color: "error",
    });
    return;
  }
  data.value = res;
  showSnackbar({
    text: `成功获取武器 ${props.item.name} 的 Wiki 数据`,
    color: "success",
  });
  if (data.value?.affix === undefined) return;
  selectItems.value = data.value?.affix.Descriptions.map((item) => item.Level) ?? [];
}

watch(
  () => props.item,
  async () => await loadData(),
);

onMounted(async () => await loadData());

async function toWiki(): Promise<void> {
  if (props.item.contentId === 0) {
    showSnackbar({
      text: `武器 ${props.item.name} 暂无详情`,
      color: "warn",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", props.item.contentId.toString());
  createTGWindow(
    url,
    "Sub_window",
    `Content_${props.item.contentId} ${props.item.name}`,
    1200,
    800,
    true,
  );
}
</script>
<style lang="css" scoped>
.tww-box {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  row-gap: 10px;
}

.tww-brief {
  display: flex;
  align-items: flex-start;
  column-gap: 10px;
}

.tww-brief-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tww-brief-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  column-gap: 10px;
  font-family: var(--font-title);
  font-size: 20px;
}

.tww-brief-info :last-child {
  cursor: pointer;
}

.tww-brief-rating {
  color: var(--common-text-title);
}

.tww-brief-desc {
  display: flex;
  align-items: flex-end;
  opacity: 0.8;
}

.tww-story {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.tww-text-title {
  font-weight: bold;
}

.tww-text-content {
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
