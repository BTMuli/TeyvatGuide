<template>
  <TOverlay v-model="visible" :to-click="onCancel" blur-val="20px" hide>
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <TItemBox :model-value="getBoxData()" />
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

import TibCalendarMaterial from "./ph-calendar-material.vue";

interface ToCalendarProps {
  modelValue: boolean;
  dataType: "weapon" | "avatar";
  dataVal: TGApp.App.Calendar.Item;
}

interface ToCalendarEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "cancel"): void;
}

const emits = defineEmits<ToCalendarEmits>();
const props = defineProps<ToCalendarProps>();

const router = useRouter();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const itemVal = computed<TGApp.App.Calendar.Item>(() => props.dataVal);

const onCancel = (): void => {
  visible.value = false;
  emits("cancel");
};

async function toDetail(item: TGApp.App.Calendar.Item): Promise<void> {
  if (item.itemType === "character") {
    await router.push(`/wiki/character/${item.id}`);
  } else {
    await router.push(`/wiki/weapon/${item.id}`);
  }
}

function getBoxData(): TItemBoxData {
  if (props.dataType === "avatar") {
    return {
      bg: props.dataVal.bg,
      icon: props.dataVal.icon,
      size: "100px",
      height: "100px",
      display: "inner",
      clickable: false,
      lt: props.dataVal.elementIcon ?? "",
      ltSize: "20px",
      innerHeight: 25,
      innerIcon: props.dataVal.weaponIcon,
      innerText: props.dataVal.name,
    };
  } else {
    return {
      bg: props.dataVal.bg,
      icon: props.dataVal.icon,
      size: "100px",
      height: "100px",
      display: "inner",
      clickable: false,
      lt: props.dataVal.weaponIcon,
      ltSize: "20px",
      innerHeight: 25,
      innerText: props.dataVal.name,
    };
  }
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
