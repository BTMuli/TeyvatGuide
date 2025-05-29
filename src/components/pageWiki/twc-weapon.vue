<template>
  <div class="tww-box" v-if="data !== undefined">
    <div class="tww-brief">
      <TItemBox :model-value="box" />
      <div class="tww-brief-info">
        <div class="tww-brief-title">
          <span>{{ data.name }}</span>
          <img
            title="前往观测枢"
            alt="observer"
            @click="toWiki()"
            v-if="props.item.contentId !== 0"
            src="/platforms/mhy/observer.webp"
          />
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
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { toObcPage } from "@utils/TGWindow.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import TwcMaterials from "./twc-materials.vue";

import { WikiWeaponData } from "@/data/index.js";

type TwcWeaponProps = { item: TGApp.App.Weapon.WikiBriefInfo };

const props = defineProps<TwcWeaponProps>();

const data = shallowRef<TGApp.App.Weapon.WikiItem>();
const box = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${data.value?.star}-Star.webp`,
  icon: `/WIKI/weapon/${data.value?.id}.webp`,
  size: "128px",
  height: "128px",
  display: "inner",
  lt: `/icon/weapon/${data.value?.weapon}.webp`,
  ltSize: "40px",
  innerHeight: 0,
  innerText: "",
  clickable: false,
}));
const select = ref<number>(1);
const selectItems = shallowRef<Array<number>>([]);

function loadData(): void {
  const res = WikiWeaponData.find((item) => item.id === props.item.id);
  if (res === undefined) {
    showSnackbar.warn(`未获取到武器 ${props.item.name} 的 Wiki 数据`);
    return;
  }
  data.value = res;
  showSnackbar.success(`成功获取武器 ${props.item.name} 的 Wiki 数据`);
  if (data.value?.affix === undefined) return;
  selectItems.value = data.value?.affix.Descriptions.map((item) => item.Level) ?? [];
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
:deep(.v-expansion-panel-title) {
  background: var(--common-shadow-1);
}

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
