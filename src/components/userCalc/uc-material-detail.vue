<!-- 养成计算-材料需求详情 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    contentMaxHeight="480px"
    :shareCaption="shareCaption"
    :topOffset="props.topOffset"
  >
    <template #left>
      <slot name="left" />
    </template>

    <template #header>
      <div class="ucmd-icon">
        <img :src="`/icon/bg/${wiki.star}-BGC.webp`" alt="" class="bg" />
        <img :src="`/icon/material/${wiki.id}.webp`" :alt="wiki.name" class="icon" />
      </div>
      <div class="ucmd-identity">
        <h2>{{ wiki.name }}</h2>
        <div class="ucmd-meta">
          <span class="ucmd-meta-tag">养成材料详情</span>
          <span class="ucmd-meta-chip">{{ wiki.type }}</span>
          <span class="ucmd-meta-chip">
            <v-icon size="12">mdi-star</v-icon>
            {{ wiki.star }} 星
          </span>
          <span
            :title="bag?.updated ? `背包数据更新于 ${bag.updated}` : '暂无背包更新时间'"
            class="ucmd-owned"
          >
            <v-icon size="14">mdi-package-variant-closed</v-icon>
            持有 {{ fmtUtil.num(bag?.count ?? material.owned) }}
          </span>
        </div>
      </div>
    </template>

    <template #actions>
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
    </template>

    <section class="ucmd-section">
      <header class="ucmd-section-title">
        <v-icon color="var(--tgc-od-orange)" size="18"> mdi-clipboard-list-outline </v-icon>
        <h3>需求信息</h3>
      </header>
      <div class="ucmd-stats">
        <div class="ucmd-stat progress">
          <span>
            {{ material.craftable > 0 ? "当前量（可合成量）/需求总量" : "当前量/需求总量" }}
          </span>
          <UcMaterialCount
            :complete="material.missing === 0"
            :craftable="material.craftable"
            :current="material.owned"
            :required="material.required"
          />
        </div>
      </div>
      <v-progress-linear
        :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        :model-value="material.progress"
        height="6"
        rounded
      />
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
        <span v-if="material.craftable > 0"> 可合成 {{ fmtUtil.num(material.craftable) }} 个 </span>
      </header>
      <div v-if="costMaterials.length > 0" class="ucmd-costs">
        <TMaterialStarChip
          v-for="cost in costMaterials"
          :key="cost.id"
          :id="cost.id"
          mode="convert"
          :name="cost.name"
          :owned="cost.local"
          :required="cost.count"
          :star="cost.star"
          :type="cost.type"
        />
      </div>
      <span v-else class="ucmd-no-cost">当前计算未使用合成材料</span>
    </section>

    <template #right>
      <slot name="right" />
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TMaterialStarChip from "@comp/app/t-material-star-chip.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import type { PboConvertSource } from "@comp/pageBag/pbo-convert.vue";
import TwoSource from "@comp/pageWiki/two-source.vue";
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed, ref, useTemplateRef } from "vue";

type UcMaterialDetailProps = {
  bag?: TGApp.Sqlite.UserBag.MaterialTable;
  footerContext?: string;
  /** 材料在列表中的序号（从 1 开始），写入分享署名 */
  idx?: number;
  material: TGApp.App.UserCalc.ResultMaterial;
  /** 列表总数；与 idx 同时传入时署名写「第 x / y 项」 */
  total?: number;
  topOffset?: string;
  uid: number;
  wiki: TGApp.App.Material.WikiItem;
};

const props = withDefaults(defineProps<UcMaterialDetailProps>(), {
  topOffset: "0px",
});
const visible = defineModel<boolean>({ required: true });
const shareLoading = ref<boolean>(false);
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
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
const shareCaption = computed<string>(() => {
  const parts: Array<string> = [
    props.footerContext ? `${props.footerContext} · 养成材料详情` : "养成材料详情",
  ];
  if (props.idx !== undefined && props.total !== undefined) {
    parts.push(`第 ${props.idx} / ${props.total} 项`);
  } else if (props.idx !== undefined) {
    parts.push(`#${props.idx}`);
  }
  parts.push(props.wiki.name, `UID ${props.uid}`);
  return parts.join(" · ");
});

async function shareMaterial(): Promise<void> {
  const panel = overlayPanel.value?.panel ?? null;
  const content = overlayPanel.value?.content ?? null;
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

defineSlots<{
  left?: () => unknown;
  right?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
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

.ucmd-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.ucmd-meta-tag,
.ucmd-meta-chip,
.ucmd-owned {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  column-gap: 2px;
}

.ucmd-meta-tag {
  color: var(--tgc-od-orange);
}

.ucmd-meta-chip {
  color: var(--box-text-2);
}

.ucmd-owned {
  color: var(--tgc-od-red);
  column-gap: 4px;
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
  grid-template-columns: minmax(0, 1fr);
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

@media (width <= 720px) {
  .ucmd-identity h2 {
    font-size: 22px;
    line-height: 32px;
  }
}
</style>
