<!-- 背包材料物品浮窗 TODO:更新记录图表 -->
<template>
  <TOverlay v-model="visible">
    <div v-if="props.data" class="pbom-container">
      <slot name="left"></slot>
      <div class="pbom-box">
        <div class="pbom-share">
          {{ props.data.tb.updated }} | UID {{ props.uid }} | TeyvatGuide v{{ version }}
        </div>
        <div class="pbom-top">
          <div class="pbom-icon">
            <img :src="`/icon/bg/${props.data.info.star}-BGC.webp`" alt="bg" class="bg" />
            <img :src="`/icon/material/${props.data.info.id}.webp`" alt="icon" class="icon" />
            <span class="cnt">{{ props.data.tb.count }}</span>
          </div>
          <div class="pbom-name" @click="shareMaterial()">{{ props.data.info.name }}</div>
          <div class="pbom-type">{{ props.data.info.type }}</div>
        </div>
        <div class="pbom-bottom">
          <div class="pbom-desc" v-html="parseHtmlText(props.data.info.description)" />
          <div v-if="props.data.info.source.length > 0" class="pbom-source">
            <TwoSource v-for="(item, index) in props.data.info.source" :key="index" :data="item" />
          </div>
          <div v-if="props.data.info.convert.length > 0" class="pbom-convert">
            <TwoConvert
              v-for="(item, index) in props.data.info.convert"
              :key="index"
              :data="item"
            />
          </div>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TwoConvert from "@comp/pageWiki/two-convert.vue";
import TwoSource from "@comp/pageWiki/two-source.vue";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, ref } from "vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type PboMaterialProps = { data: MaterialInfo; uid: string };

const props = defineProps<PboMaterialProps>();
const visible = defineModel<boolean>();
const version = ref<string>();

onMounted(async () => (version.value = await getVersion()));

async function shareMaterial(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".pbom-box");
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `materialBag_${props.data.info.id}_${props.data.tb.count}`;
  const zoom = window.outerWidth / window.innerWidth;
  await generateShareImg(fileName, element, zoom, true);
}
</script>
<style lang="scss" scoped>
.pbom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;
}

.pbom-box {
  position: relative;
  display: flex;
  width: 800px;
  max-height: 600px;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  overflow-y: auto;
  row-gap: 10px;
}

.pbom-share {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.pbom-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  background-position: center;
  background-size: cover;
  column-gap: 10px;
}

.pbom-icon {
  position: relative;
  display: flex;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  .bg {
    position: absolute;
    z-index: 0;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .icon {
    position: relative;
    width: 56px;
    height: 56px;
  }

  .cnt {
    position: absolute;
    top: -4px;
    left: 40px;
    width: fit-content;
    padding: 0 4px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 12px;
    background: var(--box-bg-2);
    color: var(--box-text-2);
    font-size: 10px;
    text-align: center;
  }
}

.pbom-name {
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 30px;
}

.pbom-type {
  position: absolute;
  right: 10px;
  bottom: 10px;
  opacity: 0.8;
}

.pbom-bottom {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.pbom-desc,
.pbom-source,
.pbom-convert {
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.pbom-desc {
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.pbom-source {
  display: flex;
  flex-direction: column;
  padding: 10px;
  font-size: 16px;
  row-gap: 5px;
  white-space: pre-wrap;
}

.pbom-convert {
  display: flex;
  flex-direction: column;
  padding: 10px;
  row-gap: 5px;
}
</style>
