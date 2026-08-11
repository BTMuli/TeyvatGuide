<template>
  <TOverlay v-model="visible" :topOffset>
    <div v-if="props.data" class="twom-container">
      <slot name="left" />
      <article ref="shareTarget" class="twom-box">
        <header class="twom-header">
          <div class="twom-icon">
            <img :src="`/icon/bg/${props.data.star}-BGC.webp`" alt="" class="bg" />
            <img
              :alt="props.data.name"
              :src="`/icon/material/${props.data.id}.webp`"
              class="icon"
            />
          </div>
          <div class="twom-identity">
            <h2>{{ props.data.name }}</h2>
            <div class="twom-meta">
              <span class="twom-type">{{ props.data.type }}</span>
              <span>
                <v-icon size="14">mdi-star</v-icon>
                {{ props.data.star }} 星
              </span>
              <span>ID {{ props.data.id }}</span>
              <slot name="meta" />
            </div>
          </div>
          <div class="twom-actions" data-html2canvas-ignore="true">
            <v-btn
              aria-label="保存物品分享图"
              density="comfortable"
              icon="mdi-share-variant"
              title="保存物品分享图"
              variant="text"
              @click="shareMaterial"
            />
            <v-btn
              aria-label="关闭物品详情"
              density="comfortable"
              icon="mdi-close"
              title="关闭物品详情"
              variant="text"
              @click="visible = false"
            />
          </div>
        </header>
        <main ref="contentTarget" :style="{ maxHeight: props.cmh }" class="twom-content">
          <section class="twom-panel">
            <header class="twom-panel-title">
              <v-icon size="18">mdi-text-box-outline</v-icon>
              <h3>物品描述</h3>
            </header>
            <div class="twom-desc" v-html="parseHtmlText(props.data.description)" />
          </section>
          <TwoFoodDetail v-if="foodData" :food="foodData" />
          <section v-if="props.data.source.length > 0" class="twom-panel">
            <header class="twom-panel-title">
              <v-icon size="18">mdi-map-marker-path</v-icon>
              <h3>获取来源</h3>
              <span>{{ props.data.source.length }} 项</span>
            </header>
            <div class="twom-source">
              <TwoSource
                v-for="(item, index) in props.data.source"
                :key="`${item.type}-${item.name}-${index}`"
                :data="item"
              />
            </div>
          </section>
          <section v-if="props.data.convert.length > 0" class="twom-panel">
            <header class="twom-panel-title">
              <v-icon size="18">mdi-transit-connection-variant</v-icon>
              <h3>合成转换</h3>
              <span>{{ props.data.convert.length }} 种配方</span>
            </header>
            <div class="twom-convert">
              <slot name="convert">
                <TwoConvert v-for="item in props.data.convert" :key="item.id" :data="item" />
              </slot>
            </div>
          </section>
          <slot name="after-content" />
        </main>
        <footer class="twom-share">
          <span>{{ eyebrow ?? "材料" }}</span>
          <span> · {{ props.shareCaption ?? `Material ${props.data.id}` }}</span>
          <span> · Rendered by TeyvatGuide v{{ version }}</span>
        </footer>
      </article>
      <slot name="right" />
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, onMounted, ref, useTemplateRef } from "vue";

import TwoConvert from "./two-convert.vue";
import TwoFoodDetail from "./two-food-detail.vue";
import TwoSource from "./two-source.vue";

import { getWikiFoodById } from "@/data/index.js";

type TwoMaterialProps = {
  cmh?: string;
  data: TGApp.App.Material.WikiItem;
  eyebrow?: string;
  shareCaption?: string;
  shareFileName?: string;
  shareScale?: number;
  topOffset?: string;
};

const props = withDefaults(defineProps<TwoMaterialProps>(), {
  eyebrow: "养成物品",
  cmh: "600px",
  shareScale: 1.2,
  topOffset: "0px",
});
const visible = defineModel<boolean>();
const version = ref<string>();
const shareTarget = useTemplateRef<HTMLElement>("shareTarget");
const contentTarget = useTemplateRef<HTMLElement>("contentTarget");
const foodData = computed<TGApp.App.Material.WikiFood | undefined>(
  () => getWikiFoodById(props.data.id) || undefined,
);

onMounted(async () => (version.value = await getVersion()));

async function shareMaterial(): Promise<void> {
  const element = shareTarget.value;
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const content = contentTarget.value;
  const contentMaxHeight = content?.style.maxHeight;
  const contentOverflowY = content?.style.overflowY;
  if (content !== null) {
    content.style.maxHeight = "none";
    content.style.overflowY = "visible";
  }
  const fileName = props.shareFileName ?? `material_${props.data.id}`;
  try {
    await generateShareImg(fileName, element, props.shareScale, true);
  } finally {
    if (content !== null) {
      content.style.maxHeight = contentMaxHeight ?? "";
      content.style.overflowY = contentOverflowY ?? "";
    }
  }
}
</script>
<style lang="scss" scoped>
.twom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.twom-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 720px;
  max-width: calc(100vw - 160px);
  max-height: calc(100vh - 64px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.twom-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 12px;
}

.twom-icon {
  position: relative;
  display: flex;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  .bg {
    position: absolute;
    width: 72px;
    height: 72px;
    border-radius: 8px;
  }

  .icon {
    position: relative;
    width: 64px;
    height: 64px;
    object-fit: contain;
  }
}

.twom-identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.twom-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px 12px;
  line-height: 16px;

  span {
    display: inline-flex;
    align-items: center;
    column-gap: 2px;
  }
}

.twom-type {
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-blue);
}

.twom-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  column-gap: 4px;
}

.twom-content {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
}

.twom-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.twom-panel-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    margin-left: auto;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }
}

.twom-desc {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twom-source {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.twom-convert {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twom-share {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}
</style>
