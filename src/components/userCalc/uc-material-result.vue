<!-- 养成计算-材料需求 -->
<template>
  <div class="ucm-result">
    <header class="ucm-header">
      <div class="ucm-heading">
        <v-icon color="var(--tgc-od-orange)" size="18">mdi-clipboard-list-outline</v-icon>
        <span>材料需求</span>
      </div>
      <v-chip size="small" variant="tonal">{{ materials.length }} 种材料</v-chip>
      <v-chip
        :color="missingKinds > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        size="small"
        variant="tonal"
      >
        {{ missingKinds > 0 ? `${missingKinds} 种不足` : "材料充足" }}
      </v-chip>
      <div v-if="showCraftingOptions" class="ucm-crafting-options">
        <div class="ucm-crafting-control">
          <v-switch
            v-model="allowCrafting"
            class="ucm-crafting-switch"
            color="var(--tgc-od-green)"
            density="compact"
            hide-details
            title="允许使用背包材料按 Wiki 配方合成"
          />
          <span>允许合成</span>
        </div>
        <div class="ucm-crafting-control">
          <v-checkbox-btn
            v-model="useDust"
            :disabled="!allowCrafting"
            color="var(--tgc-od-green)"
            density="compact"
            title="允许使用含嬗变之尘的转换配方"
          />
          <span>使用嬗变之尘</span>
        </div>
        <div class="ucm-crafting-control">
          <v-checkbox-btn
            v-model="useSolvent"
            :disabled="!allowCrafting"
            color="var(--tgc-od-green)"
            density="compact"
            title="允许使用含异梦溶媒的转换配方"
          />
          <span>使用异梦溶媒</span>
        </div>
      </div>
    </header>

    <section v-if="loading" class="ucm-empty ucm-section">
      <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="48" />
      <span>正在通过接口计算养成材料</span>
    </section>

    <template v-else-if="materials.length > 0">
      <section class="ucm-section">
        <div class="ucm-list">
          <article
            v-for="(material, index) in materials"
            :key="material.id"
            :class="{
              missing: material.missing > 0,
              ready: weakenReady && material.missing === 0,
            }"
            class="ucm-material"
            role="button"
            tabindex="0"
            title="查看材料详情"
            @click="openMaterialInfo(material, index)"
            @keydown.enter="openMaterialInfo(material, index)"
            @keydown.space.prevent="openMaterialInfo(material, index)"
          >
            <div class="ucm-material-icon">
              <img :src="`/icon/bg/${material.star}-Star.webp`" alt="background" />
              <img :src="`/icon/material/${material.id}.webp`" :alt="material.name" />
            </div>
            <div class="ucm-material-info">
              <div class="ucm-material-heading">
                <strong>{{ material.name }}</strong>
                <span
                  :class="{ complete: material.missing === 0 }"
                  :title="getMaterialCountTitle(material)"
                  class="ucm-material-count"
                >
                  <span class="owned">{{ formatCount(material.owned) }}</span>
                  <span v-if="material.craftable > 0" class="craftable">
                    ({{ formatCount(material.craftable) }})
                  </span>
                  <span>/{{ formatCount(material.required) }}</span>
                </span>
              </div>
              <div class="ucm-material-meta">{{ material.type }}</div>
              <v-progress-linear
                :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
                :model-value="material.progress"
                height="3"
                rounded
              />
            </div>
          </article>
        </div>
      </section>

      <section
        v-if="allowCrafting && craftingCosts.length > 0"
        class="ucm-cost-summary ucm-section"
      >
        <div class="ucm-cost-header">
          <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
          <span>合成消耗</span>
          <v-chip size="small" variant="tonal">{{ craftingCosts.length }} 种材料</v-chip>
        </div>
        <div class="ucm-cost-list">
          <PboConvertMaterial v-for="cost in craftingCosts" :key="cost.id" :material="cost" />
        </div>
      </section>
    </template>

    <section v-else class="ucm-empty ucm-section">
      <v-icon size="48">mdi-package-variant-closed-check</v-icon>
      <span>{{ emptyText }}</span>
    </section>
  </div>
  <UcMaterialDetail
    v-if="currentMaterial && currentWiki"
    v-model="materialOverlayVisible"
    :bag="bagMaterials.get(currentMaterial.id)"
    :material="currentMaterial"
    topOffset="132px"
    :uid
    :wiki="currentWiki"
  >
    <template #left>
      <v-btn
        aria-label="上一个养成材料"
        class="ucm-card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成材料"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个养成材料"
        class="ucm-card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成材料"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </UcMaterialDetail>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PboConvertMaterial from "@comp/pageBag/pbo-convert-material.vue";
import type { PboConvertSource } from "@comp/pageBag/pbo-convert.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import { computed, nextTick, ref, shallowRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type UcMaterialResultProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  missingKinds: number;
  uid: number;
  loading?: boolean;
  showCraftingOptions?: boolean;
  emptyText?: string;
  weakenReady?: boolean;
};

const props = withDefaults(defineProps<UcMaterialResultProps>(), {
  loading: false,
  showCraftingOptions: true,
  emptyText: "请选择角色或武器，并设置培养目标",
  weakenReady: false,
});
const allowCrafting = defineModel<boolean>("allowCrafting", { required: true });
const useDust = defineModel<boolean>("useDust", { required: true });
const useSolvent = defineModel<boolean>("useSolvent", { required: true });
const materialOverlayVisible = ref<boolean>(false);
const currentMaterialIndex = ref<number>(0);
const currentMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const currentWiki = shallowRef<TGApp.App.Material.WikiItem>();
const craftingCosts = computed<Array<PboConvertSource>>(() => {
  const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>();
  for (const material of props.materials) {
    for (const cost of material.craftingCosts) {
      const current = costs.get(cost.id);
      if (current) current.count += cost.count;
      else costs.set(cost.id, { ...cost });
    }
  }
  return Array.from(costs.values())
    .sort((a, b) => b.star - a.star || a.id - b.id)
    .map((cost) => ({
      id: String(cost.id),
      name: cost.name,
      type: cost.type,
      star: cost.star,
      count: cost.count,
      local: cost.owned,
    }));
});

async function openMaterialInfo(
  material: TGApp.App.UserCalc.ResultMaterial,
  index: number,
): Promise<void> {
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) return;
  materialOverlayVisible.value = false;
  currentMaterialIndex.value = index;
  currentMaterial.value = material;
  currentWiki.value = wiki;
  await nextTick();
  materialOverlayVisible.value = true;
}

function switchMaterial(isNext: boolean): void {
  const nextIndex = currentMaterialIndex.value + (isNext ? 1 : -1);
  if (nextIndex < 0) {
    showSnackbar.warn("已经是第一个养成材料了");
    return;
  }
  if (nextIndex >= props.materials.length) {
    showSnackbar.warn("已经是最后一个养成材料了");
    return;
  }
  const material = props.materials[nextIndex];
  const wiki = WikiMaterialData.find((item) => item.id === material?.id);
  if (!material || !wiki) return;
  currentMaterialIndex.value = nextIndex;
  currentMaterial.value = material;
  currentWiki.value = wiki;
}

function formatCount(count: number): string {
  return count.toLocaleString("zh-CN");
}

function getMaterialCountTitle(material: TGApp.App.UserCalc.ResultMaterial): string {
  const crafting = material.craftable > 0 ? `，可合成 ${formatCount(material.craftable)}` : "";
  return `持有 ${formatCount(material.owned)}${crafting}，总需 ${formatCount(material.required)}`;
}
</script>

<style lang="scss" scoped>
.ucm-result {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--app-page-bg);
  gap: 10px;
}

.ucm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.ucm-heading {
  display: flex;
  align-items: center;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  gap: 4px;
}

.ucm-section {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.ucm-crafting-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-left: auto;
  gap: 4px 12px;
}

.ucm-crafting-control {
  display: flex;
  align-items: center;
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 4px;
  white-space: nowrap;
}

.ucm-crafting-switch {
  width: 36px;
  flex: 0 0 36px;
  margin: 0;
  transform: scale(0.75);
  transform-origin: center;
}

.ucm-list {
  display: grid;
  align-content: start;
  gap: 6px;
  grid-auto-rows: 58px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ucm-material {
  display: flex;
  overflow: hidden;
  min-width: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  cursor: pointer;
  transition: opacity 160ms ease;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }

  &.missing {
    border-color: var(--tgc-od-red);
  }

  &.ready {
    opacity: 0.56;
  }
}

.ucm-material-icon {
  position: relative;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  background: var(--common-shadow-t-2);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  img:first-child {
    object-fit: cover;
  }

  img:last-child {
    object-fit: contain;
  }
}

.ucm-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 5px 8px;
  gap: 3px;
}

.ucm-material-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  > strong {
    overflow: hidden;
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucm-material-count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: baseline;
  color: var(--tgc-od-red);
  font-size: 11px;

  .owned {
    color: var(--tgc-od-blue);
  }

  .craftable {
    color: var(--tgc-od-green);
  }

  &.complete {
    color: var(--tgc-od-green);
  }
}

.ucm-material-meta {
  overflow: hidden;
  color: var(--common-text-sub);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucm-card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

.ucm-cost-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ucm-cost-header {
  display: flex;
  align-items: center;
  font-family: var(--font-title);
  font-weight: normal;
  gap: 6px;
}

.ucm-cost-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ucm-empty {
  display: flex;
  min-height: 144px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 8px;
}

@media (width <= 600px) {
  .ucm-result {
    padding: 8px;
    gap: 8px;
  }

  .ucm-list {
    grid-template-columns: 1fr;
  }
}
</style>
