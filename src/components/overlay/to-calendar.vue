<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <div class="toc-icon" style="cursor: default">
            <TibCalendarItem
              :model="itemType"
              :data="<TGApp.App.Calendar.Item>itemVal"
              :clickable="false"
            />
          </div>
          <div class="toc-material-grid">
            <TibCalendarMaterial v-for="item in itemVal.materials" :item="item" />
          </div>
        </div>
        <img src="/source/UI/item-line.webp" alt="line" class="toc-line" />
        <div class="toc-bottom">
          <div class="toc-src-box">
            <div class="toc-src-text">来源：</div>
            <img :src="`/icon/nation/${itemVal.source.area}.webp`" alt="icon" />
            <div class="toc-src-text">{{ itemVal.source.area }} - {{ itemVal.source.name }}</div>
          </div>
          <v-btn variant="outlined" @click="toDetail(itemVal)">
            <template #append>
              <img src="../../assets/icons/arrow-right.svg" alt="right" class="toc-btn-img" />
            </template>
            详情
          </v-btn>
        </div>
      </div>
      <div class="close-div">
        <div class="close-btn" @click="onCancel">
          <v-icon>mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
  <v-snackbar v-model="snackbar" :timeout="1500" color="error">
    该 {{ itemType === "weapon" ? "武器" : "角色" }} 暂无详情
  </v-snackbar>
</template>
<script setup lang="ts">
// vue
import { computed, ref } from "vue";
import TOverlay from "../main/t-overlay.vue";
import TibCalendarItem from "../itembox/tib-calendar-item.vue";
import TibCalendarMaterial from "../itembox/tib-calendar-material.vue";
// utils
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";
import { createTGWindow } from "../../utils/TGWindow";

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
  set: (value) => emits("update:modelValue", value),
});
const itemType = computed(() => props.dataType);
const itemVal = computed<TGApp.App.Calendar.Item>(() => props.dataVal);
const snackbar = ref(false);

const onCancel = () => {
  visible.value = false;
  emits("cancel");
};

function toDetail(item: TGApp.App.Calendar.Item) {
  if (item.contentId === 0) {
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.contentId.toString());
  createTGWindow(url, "素材详情", item.name, 1200, 800, true);
}
</script>
<style scoped>
/* overlay 盒子 */
.toc-box {
  width: 440px;
  height: 260px;
}

.box-div {
  height: 200px;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
  background: rgb(255 255 255 / 30%);
  color: #faf7e8;
}

.toc-top {
  display: flex;
  width: 100%;
  height: 100px;
}

.toc-icon {
  width: 100px;
  height: 100px;
}

.toc-material-grid {
  display: grid;
  margin-left: 10px;
  font-family: Genshin, serif;
  grid-gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.toc-line {
  width: 100%;
  height: auto;
}

.toc-bottom {
  display: flex;
  width: 420px;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  border-radius: 5px;
  background: rgb(0 0 0 / 30%);
}

.toc-bottom img {
  width: 50px;
  height: 50px;
}

.toc-src-box {
  display: flex;
  width: 300px;
  height: 50px;
  align-items: center;
  justify-content: left;
}

.toc-src-text {
  display: flex;
  height: 50px;
  align-items: center;
  justify-content: center;
  font-family: Genshin-Light, serif;
  font-size: 20px;
}

.toc-btn-img {
  width: 18px !important;
  height: 18px !important;
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
  border-radius: 50%;
  background: rgb(255 255 255 / 30%);
  color: #faf7e8;
  cursor: pointer;
}
</style>
