<template>
  <TOverlay v-model="visible">
    <div v-if="props.data" class="twom-container">
      <slot name="left"></slot>
      <div class="twom-box">
        <div class="twom-share">
          Material {{ props.data.id }} | Render By TeyvatGuide v{{ version }}
        </div>
        <div class="twom-top">
          <img :src="`/icon/material/${props.data.id}.webp`" alt="icon" class="twom-left" />
          <div class="twom-name" @click="shareMaterial()">{{ props.data.name }}</div>
          <div class="twom-type">{{ props.data.type }}</div>
        </div>
        <div class="twom-bottom">
          <div class="twom-desc" v-html="parseHtmlText(props.data.description)" />
          <div class="twom-source" v-if="props.data.source.length > 0">
            <TwoSource :data="item" v-for="(item, index) in props.data.source" :key="index" />
          </div>
          <div class="twom-convert" v-if="props.data.convert.length > 0">
            <TwoConvert :data="item" v-for="(item, index) in props.data.convert" :key="index" />
          </div>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, ref } from "vue";

import TwoConvert from "./two-convert.vue";
import TwoSource from "./two-source.vue";

type TwoMaterialProps = { data: TGApp.App.Material.WikiItem };

const props = defineProps<TwoMaterialProps>();
const visible = defineModel<boolean>();
const version = ref<string>();

onMounted(async () => (version.value = await getVersion()));

async function shareMaterial(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".twom-box");
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `material_${props.data.id}`;
  await generateShareImg(fileName, element, 1.2, true);
}
</script>
<style lang="css" scoped>
.twom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.twom-box {
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

.twom-share {
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

.twom-top {
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

.twom-left {
  overflow: hidden;
  width: 60px;
  border-radius: 50%;
  aspect-ratio: 1;
  background-image: v-bind("'url(/icon/bg/' + props.data.star + '-BGC.webp)'");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.twom-name {
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 30px;
}

.twom-type {
  position: absolute;
  right: 10px;
  bottom: 10px;
  opacity: 0.8;
}

.twom-bottom {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.twom-desc,
.twom-source,
.twom-convert {
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.twom-desc {
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twom-source {
  display: flex;
  flex-direction: column;
  padding: 10px;
  font-size: 16px;
  row-gap: 5px;
  white-space: pre-wrap;
}

.twom-convert {
  display: flex;
  flex-direction: column;
  padding: 10px;
  row-gap: 5px;
}
</style>
