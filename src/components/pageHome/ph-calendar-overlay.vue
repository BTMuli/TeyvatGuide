<!-- 素材日历项浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <TItemBox :model-value="boxData" />
          <div class="toc-material-grid">
            <PwMaterialItem v-for="(material, index) in materialList" :key="index" :material />
          </div>
        </div>
        <img alt="line" class="toc-line" src="/UI/app/item-line.webp" />
        <div class="toc-bottom">
          <div class="toc-src-box">
            <div class="toc-src-text">来源：</div>
            <img :src="`/icon/nation/${props.item.source.area}.webp`" alt="icon" />
            <div class="toc-src-text">
              {{ props.item.source.area }} - {{ props.item.source.name }}
            </div>
          </div>
          <v-btn variant="outlined" @click="toDetail(props.item)">详情</v-btn>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import PwMaterialItem from "@comp/pageWiki/pw-material-item.vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { WikiMaterialData } from "@/data/index.js";

type ToCalendarProps = { item: TGApp.App.Calendar.Item };

const router = useRouter();

const props = defineProps<ToCalendarProps>();
const visible = defineModel<boolean>();
const materialList = computed<Array<TGApp.App.Material.WikiItem>>(() => loadData());
const boxData = computed<TItemBoxData>(() => ({
  bg: `/icon/bg/${props.item.star}-Star.webp`,
  icon: `/WIKI/${props.item.itemType}/${props.item.id}.webp`,
  size: "100px",
  height: "100px",
  display: "inner",
  clickable: false,
  lt: props.item.element
    ? `/icon/element/${props.item.element}元素.webp`
    : `/icon/weapon/${props.item.weapon}.webp`,
  ltSize: "20px",
  innerHeight: 25,
  innerIcon: props.item.element ? `/icon/weapon/${props.item.weapon}.webp` : undefined,
  innerText: props.item.name,
}));

function loadData(): Array<TGApp.App.Material.WikiItem> {
  const tmp: Array<TGApp.App.Material.WikiItem> = [];
  for (const d of props.item.materials) {
    const material = WikiMaterialData.find((m) => m.id === d.id);
    if (material) tmp.push(material);
  }
  return tmp;
}

async function toDetail(item: TGApp.App.Calendar.Item): Promise<void> {
  if (!["character", "weapon"].includes(item.itemType)) {
    showSnackbar.error("未知类型");
    return;
  }
  await router.push(`/wiki/${item.itemType}/${item.id}`);
}
</script>
<style lang="css" scoped>
.toc-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
}

.box-div {
  display: flex;
  width: 500px;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background-color: var(--app-page-bg);
  gap: 10px;
}

.toc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toc-material-grid {
  display: grid;
  width: 100%;
  font-family: var(--font-title);
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.toc-line {
  width: 100%;
  height: auto;
}

.toc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 10px;
  padding-left: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
}

.toc-src-box {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.toc-src-box :nth-child(2) {
  height: 30px;
  margin: 5px;
  aspect-ratio: 1;
  filter: invert(87%) sepia(14%) saturate(216%) hue-rotate(180deg) brightness(81%) contrast(87%);
}

.dark .toc-src-box :nth-child(2) {
  filter: none;
}

.toc-src-text {
  display: flex;
  height: 50px;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 20px;
}
</style>
