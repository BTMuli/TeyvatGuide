<template>
  <TopOverlay
    v-if="activeMaterial"
    ref="overlayPanel"
    v-model="visible"
    :contentMaxHeight="props.cmh"
    :shareCaption="shareCaption"
    :topOffset
  >
    <template #left>
      <slot name="left" />
    </template>

    <template #header>
      <div class="twom-icon">
        <img :src="`/icon/bg/${activeMaterial.star}-BGC.webp`" alt="" class="bg" />
        <img
          :alt="activeMaterial.name"
          :src="`/icon/material/${activeMaterial.id}.webp`"
          class="icon"
        />
      </div>
      <div class="twom-identity">
        <h2>{{ activeMaterial.name }}</h2>
        <div class="twom-meta">
          <span class="twom-meta-tag">{{ eyebrow }}</span>
          <span class="twom-meta-chip">{{ activeMaterial.type }}</span>
          <span v-if="bookVol" class="twom-meta-chip">{{ bookVol }}</span>
          <span class="twom-meta-chip">
            <v-icon size="12">mdi-star</v-icon>
            {{ activeMaterial.star }} 星
          </span>
          <slot v-if="isSourceMaterial" name="meta" />
        </div>
      </div>
    </template>

    <template #actions>
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
    </template>

    <section v-if="activeMaterial.description.trim().length > 0" class="twom-panel">
      <header class="twom-panel-title">
        <v-icon size="18">mdi-text-box-outline</v-icon>
        <h3>物品描述</h3>
      </header>
      <div class="twom-desc" v-html="parseHtmlText(activeMaterial.description)" />
    </section>
    <TwoFoodDetail
      v-if="foodData"
      :food="foodData"
      :recipe="foodRecipe"
      @select-food="selectFoodVariant"
    />
    <TwoBookDetail v-if="bookData" :book="bookData" />
    <section v-if="activeMaterial.source.length > 0" class="twom-panel">
      <header class="twom-panel-title">
        <v-icon size="18">mdi-map-marker-path</v-icon>
        <h3>获取来源</h3>
        <span>{{ activeMaterial.source.length }} 项</span>
      </header>
      <div class="twom-source">
        <TwoSource
          v-for="(item, index) in activeMaterial.source"
          :key="`${item.type}-${item.name}-${index}`"
          :data="item"
        />
      </div>
    </section>
    <section v-if="activeMaterial.convert.length > 0" class="twom-panel">
      <header class="twom-panel-title">
        <v-icon size="18">mdi-transit-connection-variant</v-icon>
        <h3>合成转换</h3>
        <span>{{ activeMaterial.convert.length }} 种配方</span>
      </header>
      <div class="twom-convert">
        <template v-if="isSourceMaterial">
          <slot name="convert">
            <TwoConvert v-for="item in activeMaterial.convert" :key="item.id" :data="item" />
          </slot>
        </template>
        <template v-else>
          <TwoConvert v-for="item in activeMaterial.convert" :key="item.id" :data="item" />
        </template>
      </div>
    </section>
    <slot v-if="isSourceMaterial" name="after-content" />

    <template #right>
      <slot name="right" />
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, shallowRef, useTemplateRef, watch } from "vue";

import TwoBookDetail from "./two-book-detail.vue";
import TwoConvert from "./two-convert.vue";
import TwoFoodDetail from "./two-food-detail.vue";
import TwoSource from "./two-source.vue";

import {
  getWikiBookById,
  getWikiFoodById,
  getWikiFoodRecipeByFoodId,
  getWikiMaterialById,
} from "@/data/index.js";

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
  shareScale: 1.5,
  topOffset: "0px",
});
const visible = defineModel<boolean>();
const activeMaterial = shallowRef<TGApp.App.Material.WikiItem>(props.data);
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const foodData = computed<TGApp.App.Material.WikiFood | undefined>(() =>
  getWikiFoodById(activeMaterial.value.id),
);
const foodRecipe = computed<TGApp.App.Material.WikiFoodRecipe | undefined>(() =>
  getWikiFoodRecipeByFoodId(activeMaterial.value.id),
);
const bookData = computed<TGApp.App.Material.WikiBook | undefined>(() =>
  getWikiBookById(activeMaterial.value.id),
);
const bookVol = computed<string | undefined>(() => bookData.value?.vol);
const isSourceMaterial = computed<boolean>(() => activeMaterial.value.id === props.data.id);
const shareCaption = computed<string>(() => {
  const eyebrowText = props.eyebrow ?? "材料";
  const detail =
    isSourceMaterial.value && props.shareCaption
      ? props.shareCaption
      : `Material ${activeMaterial.value.id}`;
  return `${eyebrowText} · ${detail}`;
});

watch(
  () => props.data,
  (data) => {
    activeMaterial.value = data;
  },
);
watch(visible, (isVisible) => {
  if (isVisible) activeMaterial.value = props.data;
});

function selectFoodVariant(foodId: number): void {
  const material = getWikiMaterialById(foodId);
  if (material === undefined) {
    console.warn(`料理变体 ${foodId} 未找到对应材料`);
    return;
  }
  activeMaterial.value = material;
}

async function shareMaterial(): Promise<void> {
  const panel = overlayPanel.value?.panel ?? null;
  if (panel === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const content = overlayPanel.value?.content ?? null;
  const contentMaxHeight = content?.style.maxHeight;
  const contentOverflowY = content?.style.overflowY;
  if (content !== null) {
    content.style.maxHeight = "none";
    content.style.overflowY = "visible";
  }
  const sourceFileName = isSourceMaterial.value ? props.shareFileName : undefined;
  const fileName =
    foodData.value === undefined
      ? (sourceFileName ?? `material_${activeMaterial.value.id}`)
      : `food_${activeMaterial.value.id}`;
  try {
    await generateShareImg(fileName, panel, props.shareScale, true);
  } finally {
    if (content !== null) {
      content.style.maxHeight = contentMaxHeight ?? "";
      content.style.overflowY = contentOverflowY ?? "";
    }
  }
}

defineSlots<{
  "after-content"?: () => unknown;
  convert?: () => unknown;
  left?: () => unknown;
  meta?: () => unknown;
  right?: () => unknown;
}>();
</script>
<style lang="scss" scoped>
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
  gap: 4px;

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
  gap: 8px;
  line-height: 16px;
}

.twom-meta-tag,
.twom-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  column-gap: 2px;
}

.twom-meta-tag {
  color: var(--tgc-od-orange);
}

.twom-meta-chip {
  color: var(--box-text-2);
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
</style>
