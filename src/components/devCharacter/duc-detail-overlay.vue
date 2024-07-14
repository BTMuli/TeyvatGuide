<template>
  <TOverlay v-model="visible" hide :to-click="onOverlayCancel" blur-val="20px">
    <div class="duc-do-box">
      <!-- 左侧箭头 -->
      <div class="duc-arrow-left" @click="handleClick('left')">
        <img src="../../assets/icons/arrow-right.svg" alt="left" />
      </div>
      <!-- 中间内容 -->
      <div class="duc-do-container">
        <img :src="nameCard" class="duc-doc-bg" v-if="nameCard !== false" alt="bg" />
        <div class="duc-doc-bgc" />
        <!-- 左上角色跟武器 -->
        <div class="duc-doc-lt">
          <DucDetailOlt :data="props.dataVal" mode="avatar" />
          <DucDetailOlt :data="JSON.parse(props.dataVal.weapon)" mode="weapon" />
          <DucDetailRelics :data="props.dataVal.reliquary" />
        </div>
        <v-btn
          class="duc-doc-btn"
          @click="share"
          variant="outlined"
          :loading="loading"
          data-html2canvas-ignore
        >
          <v-icon>mdi-share-variant</v-icon>
          <span>分享</span>
        </v-btn>
        <!-- 右侧天赋 -->
        <div class="duc-doc-rt">
          <DucDetailOrt :model-value="JSON.parse(props.dataVal.talent)" />
        </div>
        <!-- 左下命座 -->
        <div class="duc-doc-lb">
          <DucDetailOlb :model-value="JSON.parse(props.dataVal.constellation)" />
        </div>
        <!-- 底部水印信息 -->
        <div class="duc-doc-bt">
          UID: {{ props.dataVal.uid }} Updated: {{ props.dataVal.updated }} | Rendered by
          TeyvatGuide v{{ version }}
        </div>
      </div>
      <!-- 右侧箭头 -->
      <div class="duc-arrow-right" @click="handleClick('right')">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { computed, onMounted, onUpdated, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { generateShareImg } from "../../utils/TGShare.js";
import TOverlay from "../main/t-overlay.vue";

import DucDetailOlb from "./duc-detail-olb.vue";
import DucDetailOlt from "./duc-detail-olt.vue";
import DucDetailOrt from "./duc-detail-ort.vue";
import DucDetailRelics from "./duc-detail-relics.vue";

interface DucDetailOverlayProps {
  modelValue: boolean;
  dataVal: TGApp.Sqlite.Character.UserRole;
}

type DucDetailOverlayEmits = {
  (e: "update:modelValue", value: boolean): void;
  (e: "clickL"): void;
  (e: "clickR"): void;
};

const props = defineProps<DucDetailOverlayProps>();
const emits = defineEmits<DucDetailOverlayEmits>();
const version = await app.getVersion();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

// share
const loading = ref<boolean>(false);
// 渲染数据
const nameCard = ref<string | false>(false);

function onOverlayCancel() {
  visible.value = false;
  emits("update:modelValue", false);
}

function handleClick(pos: "left" | "right") {
  pos === "left" ? emits("clickL") : emits("clickR");
}

onMounted(async () => {
  await loadData();
});
onUpdated(async () => {
  await loadData();
  console.log("updated, loadData");
  console.log(props.dataVal);
});

async function loadData(): Promise<void> {
  if (!props.modelValue) return;
  if (props.dataVal.cid !== 10000005 && props.dataVal.cid !== 10000007) {
    const role = await TGSqlite.getAppCharacter(props.dataVal.cid);
    nameCard.value = `/source/nameCard/profile/${role.nameCard}.webp`;
  } else {
    nameCard.value = "/source/nameCard/profile/原神·印象.webp";
  }
}

async function share(): Promise<void> {
  const detailBox = <HTMLElement>document.querySelector(".duc-do-container");
  const fileName = `【角色详情】-${props.dataVal.name}`;
  loading.value = true;
  await generateShareImg(fileName, detailBox);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.duc-do-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 10px;
}

.duc-arrow-left,
.duc-arrow-right {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dark .duc-arrow-left,
.dark .duc-arrow-right {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.duc-arrow-left img {
  width: 100%;
  height: 100%;
  transform: rotate(180deg);
}

.duc-arrow-right img {
  width: 100%;
  height: 100%;
}

.duc-do-container {
  position: relative;
  overflow: hidden;
  width: 800px;
  border-radius: 5px;
  aspect-ratio: 21 / 10;
  background: var(--box-bg-1);
}

.duc-doc-bg {
  position: absolute;
  right: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.duc-doc-bgc {
  position: absolute;
  right: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 20%);
}

.duc-doc-lt {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  row-gap: 10px;
}

.duc-doc-btn {
  position: absolute;
  bottom: 90px;
  left: 370px;
  color: var(--tgc-white-1);
}

.duc-doc-rt {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px;
}

.duc-doc-lb {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 5px;
}

.duc-doc-bt {
  position: absolute;
  right: 10px;
  bottom: -1px;
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 2px var(--tgc-dark-2);
}
</style>
