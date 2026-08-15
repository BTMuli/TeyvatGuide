<!-- 养成计算-材料需求详情 -->
<template>
  <TOverlay v-model="visible" :topOffset="props.topOffset">
    <div class="ucmd-container">
      <slot name="left" />
      <article ref="shareTarget" class="ucmd-panel">
        <header class="ucmd-header">
          <div class="ucmd-icon">
            <img :src="`/icon/bg/${wiki.star}-BGC.webp`" alt="" class="bg" />
            <img :src="`/icon/material/${wiki.id}.webp`" :alt="wiki.name" class="icon" />
          </div>
          <div class="ucmd-identity">
            <h2>{{ wiki.name }}</h2>
            <div class="ucmd-meta">
              <span class="ucmd-meta-tag">养成材料详情</span>
              <span>{{ wiki.type }}</span>
              <span>{{ wiki.star }} 星</span>
              <span>ID {{ wiki.id }} · UID {{ uid }}</span>
            </div>
          </div>
          <div class="ucmd-actions" data-html2canvas-ignore="true">
            <v-btn
              :loading="shareLoading"
              aria-label="保存养成材料详情分享图"
              density="comfortable"
              icon="mdi-share-variant"
              title="保存养成材料详情分享图"
              variant="text"
              @click="shareMaterial"
            />
            <v-btn
              aria-label="关闭养成材料详情"
              density="comfortable"
              icon="mdi-close"
              title="关闭"
              variant="text"
              @click="visible = false"
            />
          </div>
        </header>

        <main ref="contentTarget" class="ucmd-content">
          <section class="ucmd-section">
            <header class="ucmd-section-title">
              <v-icon color="var(--tgc-od-orange)" size="18"> mdi-clipboard-list-outline </v-icon>
              <h3>需求信息</h3>
              <span>{{ material.missing > 0 ? `仍缺少 ${material.missing}` : "材料已满足" }}</span>
            </header>
            <div :class="{ 'has-crafting': material.craftable > 0 }" class="ucmd-stats">
              <div class="ucmd-stat required">
                <span>需要</span>
                <strong>{{ material.required }}</strong>
              </div>
              <div class="ucmd-stat owned">
                <span>持有</span>
                <strong>{{ material.owned }}</strong>
              </div>
              <div v-if="material.craftable > 0" class="ucmd-stat craftable">
                <span>可合成</span>
                <strong>{{ material.craftable }}</strong>
              </div>
              <div class="ucmd-stat missing">
                <span>仍缺少</span>
                <strong>{{ material.missing }}</strong>
              </div>
            </div>
            <v-progress-linear
              :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
              :model-value="material.progress"
              height="6"
              rounded
            />
          </section>

          <section class="ucmd-section">
            <header class="ucmd-section-title">
              <v-icon color="var(--tgc-od-blue)" size="18">mdi-bag-personal-outline</v-icon>
              <h3>背包持有</h3>
              <span>{{ bag?.updated ? `更新于 ${bag.updated}` : "暂无更新时间" }}</span>
            </header>
            <div class="ucmd-bag-owned">
              <span>当前数量</span>
              <strong class="ucmd-bag-count">{{ bag?.count ?? material.owned }}</strong>
            </div>
          </section>

          <section v-if="wiki.description.trim().length > 0" class="ucmd-section">
            <header class="ucmd-section-title">
              <v-icon size="18">mdi-text-box-outline</v-icon>
              <h3>材料描述</h3>
            </header>
            <div class="ucmd-desc" v-html="parseHtmlText(wiki.description)" />
          </section>

          <section v-if="wiki.source.length > 0" class="ucmd-section">
            <header class="ucmd-section-title">
              <v-icon size="18">mdi-map-marker-path</v-icon>
              <h3>获取来源</h3>
              <span>{{ wiki.source.length }} 项</span>
            </header>
            <div class="ucmd-source">
              <TwoSource v-for="(item, index) in wiki.source" :key="index" :data="item" />
            </div>
          </section>

          <section v-if="wiki.convert.length > 0" class="ucmd-section">
            <header class="ucmd-section-title">
              <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
              <h3>合成消耗</h3>
              <span>可合成 {{ material.craftable }} 个</span>
            </header>
            <div v-if="costMaterials.length > 0" class="ucmd-costs">
              <PboConvertMaterial v-for="cost in costMaterials" :key="cost.id" :material="cost" />
            </div>
            <span v-else class="ucmd-no-cost">当前计算未使用合成材料</span>
          </section>
        </main>

        <footer class="ucmd-footer">
          <span>{{ footerContext ? `${footerContext} · 养成材料详情` : "养成材料详情" }}</span>
          <span> · {{ wiki.name }} · ID {{ wiki.id }} · UID {{ uid }}</span>
          <span> · Rendered by TeyvatGuide v{{ version }}</span>
        </footer>
      </article>
      <slot name="right" />
    </div>
  </TOverlay>
</template>

<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PboConvertMaterial from "@comp/pageBag/pbo-convert-material.vue";
import type { PboConvertSource } from "@comp/pageBag/pbo-convert.vue";
import TwoSource from "@comp/pageWiki/two-source.vue";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, onMounted, ref, useTemplateRef } from "vue";

type UcMaterialDetailProps = {
  bag?: TGApp.Sqlite.UserBag.MaterialTable;
  footerContext?: string;
  material: TGApp.App.UserCalc.ResultMaterial;
  topOffset?: string;
  uid: number;
  wiki: TGApp.App.Material.WikiItem;
};

const props = withDefaults(defineProps<UcMaterialDetailProps>(), {
  topOffset: "0px",
});
const visible = defineModel<boolean>({ required: true });
const version = ref<string>();
const shareLoading = ref<boolean>(false);
const shareTarget = useTemplateRef<HTMLElement>("shareTarget");
const contentTarget = useTemplateRef<HTMLElement>("contentTarget");
const costMaterials = computed<Array<PboConvertSource>>(() =>
  props.material.craftingCosts.map((cost) => ({
    id: String(cost.id),
    name: cost.name,
    type: cost.type,
    star: cost.star,
    count: cost.count,
    local: cost.owned,
  })),
);

onMounted(async () => (version.value = await getVersion()));

async function shareMaterial(): Promise<void> {
  const panel = shareTarget.value;
  const content = contentTarget.value;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到养成材料详情");
    return;
  }

  const contentMaxHeight = content.style.maxHeight;
  const contentOverflowY = content.style.overflowY;
  shareLoading.value = true;
  await showLoading.start("正在生成分享图片", props.wiki.name);
  await TGLogger.Info(`[CultivationMaterial][share][${props.wiki.id}] 开始生成材料详情图片`);
  content.style.maxHeight = "none";
  content.style.overflowY = "visible";
  try {
    await generateShareImg(`养成材料详情_${props.wiki.name}_${props.uid}`, panel, 1.5, true);
  } finally {
    content.style.maxHeight = contentMaxHeight;
    content.style.overflowY = contentOverflowY;
    await showLoading.end();
    shareLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.ucmd-container {
  display: flex;
  max-height: calc(100% - 32px);
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.ucmd-panel {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 800px;
  max-width: calc(100vw - 160px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.ucmd-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 12px;
}

.ucmd-icon {
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

.ucmd-identity {
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

.ucmd-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.ucmd-meta-tag {
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-orange);
}

.ucmd-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  gap: 4px;
}

.ucmd-content {
  display: flex;
  min-height: 0;
  max-height: 480px;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
}

.ucmd-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;
}

.ucmd-section-title {
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

.ucmd-stats {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  &.has-crafting {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.ucmd-stat {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 8px;

  span {
    color: var(--common-text-sub);
  }

  strong {
    overflow: hidden;
    font-family: var(--font-title);
    font-weight: normal;
    text-overflow: ellipsis;
  }

  &.required strong {
    color: var(--tgc-od-orange);
  }

  &.owned strong {
    color: var(--tgc-od-blue);
  }

  &.craftable strong {
    color: var(--tgc-od-green);
  }

  &.missing strong {
    color: var(--tgc-od-red);
  }
}

.ucmd-bag-owned {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  background: var(--common-shadow-t-1);
}

.ucmd-bag-count {
  color: var(--tgc-od-blue);
  font-family: var(--font-title);
  font-weight: normal;
}

.ucmd-desc {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}

.ucmd-source {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 0.5fr));
}

.ucmd-costs {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 0.5fr));
}

.ucmd-no-cost {
  color: var(--common-text-sub);
}

.ucmd-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}

@media (width <= 720px) {
  .ucmd-panel {
    max-width: calc(100vw - 112px);
  }

  .ucmd-stats,
  .ucmd-stats.has-crafting {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ucmd-identity h2 {
    font-size: 22px;
    line-height: 32px;
  }
}
</style>
