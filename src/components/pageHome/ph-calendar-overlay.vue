<template>
  <TOverlay v-model="visible">
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <TItemBox :model-value="boxData" />
          <div class="toc-material-grid">
            <TibCalendarMaterial
              v-for="(item, index) in itemVal.materials"
              :key="index"
              :item="item"
            />
          </div>
        </div>
        <img alt="line" class="toc-line" src="/source/UI/item-line.webp" />
        <div class="toc-bottom">
          <div class="toc-src-box">
            <div class="toc-src-text">来源：</div>
            <img :src="`/icon/nation/${itemVal.source.area}.webp`" alt="icon" />
            <div class="toc-src-text">{{ itemVal.source.area }} - {{ itemVal.source.name }}</div>
          </div>
          <v-btn variant="outlined" @click="toDetail(itemVal)">详情</v-btn>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

import TItemBox, { TItemBoxData } from "../app/t-item-box.vue";
import TOverlay from "../app/t-overlay.vue";
import showSnackbar from "../func/snackbar.js";

import TibCalendarMaterial from "./ph-calendar-material.vue";

type ToCalendarProps = {
  modelValue: boolean;
  dataType: "weapon" | "avatar";
  dataVal: TGApp.App.Calendar.Item;
};
type ToCalendarEmits = (e: "update:modelValue", v: boolean) => void;

const props = defineProps<ToCalendarProps>();
const emits = defineEmits<ToCalendarEmits>();
const router = useRouter();
const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (v) => emits("update:modelValue", v),
});
const itemVal = computed<TGApp.App.Calendar.Item>(() => props.dataVal);
const boxData = computed<TItemBoxData>(() => {
  return {
    bg: itemVal.value.bg,
    icon: itemVal.value.icon,
    size: "100px",
    height: "100px",
    display: "inner",
    clickable: false,
    lt: props.dataType === "avatar" ? (itemVal.value.elementIcon ?? "") : itemVal.value.weaponIcon,
    ltSize: "20px",
    innerHeight: 25,
    innerIcon: props.dataType === "avatar" ? itemVal.value.weaponIcon : undefined,
    innerText: itemVal.value.name,
  };
});

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
  grid-gap: 10px;
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
