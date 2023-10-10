<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <TibCalendarItem
            :model="itemType"
            :data="<TGApp.App.Calendar.Item>itemVal"
            :clickable="false"
          />
          <div class="toc-material-grid">
            <TibCalendarMaterial
              v-for="(item, index) in itemVal.materials"
              :key="index"
              :item="item"
            />
          </div>
        </div>
        <img src="/source/UI/item-line.webp" alt="line" class="toc-line" />
        <div class="toc-bottom">
          <div class="toc-src-box">
            <div class="toc-src-text">来源：</div>
            <img :src="`/icon/nation/${itemVal.source.area}.webp`" alt="icon" />
            <div class="toc-src-text">{{ itemVal.source.area }} - {{ itemVal.source.name }}</div>
          </div>
          <v-btn variant="outlined" @click="toDetail(itemVal)">详情</v-btn>
        </div>
      </div>
      <div class="close-div">
        <div class="close-btn" @click="onCancel">
          <v-icon>mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed } from "vue";

import Mys from "../../plugins/Mys";
import { createTGWindow } from "../../utils/TGWindow";
import showSnackbar from "../func/snackbar";
import TibCalendarItem from "../itembox/tib-calendar-item.vue";
import TibCalendarMaterial from "../itembox/tib-calendar-material.vue";
import TOverlay from "../main/t-overlay.vue";

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

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const itemType = computed(() => props.dataType);
const itemVal = computed<TGApp.App.Calendar.Item>(() => props.dataVal);

const onCancel = (): void => {
  visible.value = false;
  emits("cancel");
};

function toDetail(item: TGApp.App.Calendar.Item): void {
  if (item.contentId === 0) {
    const itemType = item.itemType === "avatar" ? "角色" : "武器";
    showSnackbar({
      text: `[${itemType}] ${item.name} 暂无详情`,
      color: "warn",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", item.contentId.toString());
  createTGWindow(url, "Sub_window", `Content_${item.contentId} ${item.name}`, 1200, 800, true);
}
</script>
<style scoped>
/* overlay 盒子 */
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
  border-radius: 50%;
  margin: 5px;
  aspect-ratio: 1;
  background: var(--common-shadow-4);
}

.toc-src-text {
  display: flex;
  height: 50px;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 20px;
}

.close-div {
  display: flex;
  width: 100%;
  height: 60px;
  align-items: center;
  justify-content: center;
}

.close-btn {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 50%;
  background: var(--app-page-bg);
  color: var(--tgc-yellow-1);
  cursor: pointer;
}
</style>
