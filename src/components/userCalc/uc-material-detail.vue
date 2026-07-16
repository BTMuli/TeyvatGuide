<!-- 养成计算-材料需求详情 -->
<template>
  <TOverlay v-model="visible">
    <div class="ucmd-container">
      <div class="ucmd-box">
        <div class="ucmd-share">ID {{ wiki.id }} | UID {{ uid }}</div>
        <div class="ucmd-top">
          <div class="ucmd-icon">
            <img :src="`/icon/bg/${wiki.star}-BGC.webp`" alt="bg" class="bg" />
            <img :src="`/icon/material/${wiki.id}.webp`" :alt="wiki.name" class="icon" />
          </div>
          <div class="ucmd-name">{{ wiki.name }}</div>
          <div class="ucmd-type">持有 {{ material.owned }} · {{ wiki.type }}</div>
        </div>

        <div class="ucmd-mid">
          <div class="ucmd-desc" v-html="parseHtmlText(wiki.description)" />
          <div v-if="wiki.source.length > 0" class="ucmd-source">
            <TwoSource v-for="(item, index) in wiki.source" :key="index" :data="item" />
          </div>
        </div>

        <div class="ucmd-section">
          <div class="ucmd-section-title">
            <v-icon color="var(--tgc-od-orange)" size="16">mdi-clipboard-list-outline</v-icon>
            <span>需求信息</span>
          </div>
          <div :class="{ 'has-crafting': wiki.convert.length > 0 }" class="ucmd-stats">
            <div class="ucmd-stat required">
              <span>需要</span>
              <strong>{{ material.required }}</strong>
            </div>
            <div class="ucmd-stat owned">
              <span>持有</span>
              <strong>{{ material.owned }}</strong>
            </div>
            <div v-if="wiki.convert.length > 0" class="ucmd-stat craftable">
              <span>可合成</span>
              <strong>{{ material.craftable }}</strong>
            </div>
            <div class="ucmd-stat missing">
              <span>仍缺少</span>
              <strong>{{ material.missing }}</strong>
            </div>
          </div>
        </div>

        <div class="ucmd-section">
          <div class="ucmd-section-title">
            <v-icon color="var(--tgc-od-blue)" size="16">mdi-bag-personal-outline</v-icon>
            <span>背包持有</span>
          </div>
          <div class="ucmd-bag-owned">
            <span>当前数量：</span>
            <strong class="ucmd-bag-count">{{ bag?.count ?? material.owned }}</strong>
            <span class="ucmd-bag-updated">
              {{ bag?.updated ? `更新于 ${bag.updated}` : "暂无更新时间" }}
            </span>
          </div>
        </div>

        <div v-if="wiki.convert.length > 0" class="ucmd-section">
          <div class="ucmd-section-title">
            <v-icon color="var(--tgc-od-green)" size="16">mdi-all-inclusive</v-icon>
            <span>合成消耗</span>
            <span class="ucmd-section-extra">合成 {{ material.craftable }} 个</span>
          </div>
          <div v-if="costMaterials.length > 0" class="ucmd-costs">
            <PboConvertMaterial v-for="cost in costMaterials" :key="cost.id" :material="cost" />
          </div>
          <span v-else class="ucmd-no-cost">当前计算未使用合成材料</span>
        </div>
      </div>
    </div>
  </TOverlay>
</template>

<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import PboConvertMaterial from "@comp/pageBag/pbo-convert-material.vue";
import type { PboConvertSource } from "@comp/pageBag/pbo-convert.vue";
import TwoSource from "@comp/pageWiki/two-source.vue";
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed } from "vue";

type UcMaterialDetailProps = {
  bag?: TGApp.Sqlite.UserBag.MaterialTable;
  material: TGApp.App.UserCalc.ResultMaterial;
  uid: number;
  wiki: TGApp.App.Material.WikiItem;
};

const props = defineProps<UcMaterialDetailProps>();
const visible = defineModel<boolean>({ required: true });
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
</script>

<style lang="scss" scoped>
.ucmd-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ucmd-box {
  position: relative;
  display: flex;
  width: 800px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 10px;
}

.ucmd-share {
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

.ucmd-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  column-gap: 10px;
}

.ucmd-icon {
  position: relative;
  display: flex;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  .bg {
    position: absolute;
    width: 64px;
    height: 64px;
    border-radius: 50%;
  }

  .icon {
    position: relative;
    width: 56px;
    height: 56px;
  }
}

.ucmd-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 30px;
}

.ucmd-type {
  position: absolute;
  right: 10px;
  bottom: 10px;
  opacity: 0.8;
}

.ucmd-mid {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.ucmd-desc,
.ucmd-source,
.ucmd-section {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.ucmd-desc {
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.ucmd-source {
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.ucmd-section {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.ucmd-section-title {
  display: flex;
  width: 100%;
  align-items: center;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;
}

.ucmd-section-extra {
  margin-left: auto;
  color: var(--common-text-sub);
  font-family: var(--font-text);
  font-size: 12px;
}

.ucmd-stats {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  &.has-crafting {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.ucmd-bag-count {
  color: var(--tgc-od-blue);
  font-family: var(--font-title);
}

.ucmd-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 8px;

  strong {
    font-family: var(--font-title);
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
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 4px;
}

.ucmd-bag-updated {
  margin-left: auto;
  color: var(--common-text-sub);
  font-size: 12px;
  white-space: nowrap;
}

.ucmd-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ucmd-no-cost {
  color: var(--common-text-sub);
}

@media (width <= 600px) {
  .ucmd-name {
    font-size: 22px;
  }

  .ucmd-type {
    position: static;
    margin-left: auto;
  }

  .ucmd-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
