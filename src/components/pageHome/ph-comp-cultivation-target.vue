<!-- 首页养成计划目标卡片 -->
<template>
  <div
    :class="{ today: hasTodayMaterial }"
    class="phct-target"
    title="查看养成目标"
    @click="emits('target-click', entry)"
  >
    <UcItemIcon
      :alt="entry.name"
      :icon="entry.icon"
      :primary-badge="entryBadge"
      :size="48"
      :star="entry.star"
    />
    <div class="phct-info">
      <button
        :aria-label="`查看${entry.name}养成目标`"
        class="phct-name-row"
        type="button"
        @click.stop="emits('target-click', entry)"
      >
        <span>{{ entry.name }}</span>
      </button>
      <small>
        Lv.{{ entry.currentState.level }}
        <v-icon size="12">mdi-arrow-right</v-icon>
        Lv.{{ entry.targetState.level }}
      </small>
    </div>
    <div v-if="sortedMissingMaterials.length > 0" class="phct-materials" title="材料需求">
      <UcItemIcon
        v-for="material in sortedMissingMaterials.slice(0, 4)"
        :key="material.id"
        :alt="material.name"
        :aria-label="`查看${material.name}材料`"
        :icon="`/icon/material/${material.id}.webp`"
        :size="32"
        :star="material.star"
        :title="getMaterialCountTitle(material)"
        class="phct-material"
        circular
        role="button"
        tabindex="0"
        @click.stop="openMaterial(material.id)"
        @keydown.enter.stop.prevent="openMaterial(material.id)"
        @keydown.space.stop.prevent="openMaterial(material.id)"
      />
      <span v-if="sortedMissingMaterials.length > 4">
        +{{ sortedMissingMaterials.length - 4 }}
      </span>
    </div>
  </div>
  <PboMaterial
    v-if="currentMaterial"
    v-model="materialOverlayVisible"
    :data="currentMaterial"
    :uid
    topOffset="64px"
  />
</template>

<script lang="ts" setup>
import PboMaterial from "@comp/pageBag/pbo-material.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed, nextTick, ref, shallowRef } from "vue";

import { AppCharacterData, AppWeaponData, WikiMaterialData } from "@/data/index.js";
import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type PhCompCultivationTargetProps = {
  entry: TGApp.Sqlite.Cultivation.EntryWithItems;
  hasTodayMaterial: boolean;
  missingMaterials: Array<TGApp.App.UserCalc.ResultMaterial>;
  uid: number;
};

type PhCompCultivationTargetEmits = {
  "target-click": [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
};

const props = defineProps<PhCompCultivationTargetProps>();
const emits = defineEmits<PhCompCultivationTargetEmits>();
const materialOverlayVisible = ref<boolean>(false);
const currentMaterial = shallowRef<MaterialInfo>();
const sortedMissingMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  [...props.missingMaterials].sort(
    (a, b) => b.star - a.star || b.missing - a.missing || a.id - b.id,
  ),
);

const entryBadge = computed<string | undefined>(() => {
  if (props.entry.type === "avatar") {
    const character = AppCharacterData.find((item) => item.id === props.entry.itemId);
    const element =
      props.entry.currentState.element ??
      (props.entry.itemId === 10000005 || props.entry.itemId === 10000007
        ? undefined
        : character?.element);
    return element ? `/icon/element/${element}元素.webp` : undefined;
  }
  const weapon = AppWeaponData.find((item) => item.id === props.entry.itemId);
  return weapon ? `/icon/weapon/${weapon.weapon}.webp` : undefined;
});

function getMaterialCountTitle(material: TGApp.App.UserCalc.ResultMaterial): string {
  const current = fmtUtil.num(material.owned);
  const craftable = material.craftable > 0 ? `（${fmtUtil.num(material.craftable)}）` : "";
  const required = fmtUtil.num(material.required);
  return `${material.name}：${current}${craftable}/${required}`;
}

async function openMaterial(materialId: number): Promise<void> {
  const info = WikiMaterialData.find((material) => material.id === materialId);
  if (!info) return;
  materialOverlayVisible.value = false;
  currentMaterial.value = {
    info,
    tb: {
      count: 0,
      id: materialId,
      uid: props.uid,
      updated: "",
    },
  };
  await nextTick();
  materialOverlayVisible.value = true;
}
</script>

<style lang="scss" scoped>
.phct-target,
.phct-info {
  display: flex;
}

.phct-target,
.phct-info {
  flex-direction: column;
}

.phct-target {
  min-width: 0;
  flex-direction: row;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  cursor: pointer;
  gap: 10px;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;

  &.today {
    border-color: var(--tgc-od-orange);
    border-left-width: 3px;
    background: var(--common-shadow-t-1);
  }

  &:hover {
    border-color: var(--tgc-od-orange);
  }
}

.phct-info {
  min-width: 0;

  small {
    display: flex;
    align-items: center;
    color: var(--common-text-sub);
    gap: 3px;
  }
}

.phct-name-row {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--tgc-od-orange);
    outline-offset: 2px;
  }

  span {
    overflow: hidden;
    font-family: var(--font-title);
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.phct-materials {
  display: flex;
  min-width: 0;
  flex: none;
  align-items: center;
  margin-left: auto;
  gap: 3px;

  .phct-material {
    position: relative;
    z-index: 1;

    & + .phct-material {
      margin-left: -10px;
    }

    &:hover {
      z-index: 2;
    }

    &:focus-visible {
      border-radius: 6px;
      outline: 2px solid var(--tgc-od-orange);
      outline-offset: 2px;
    }
  }

  span {
    display: grid;
    width: 32px;
    height: 32px;
    flex: none;
    border: 1px solid var(--common-shadow-1);
    border-radius: 50%;
    margin-left: -10px;
    backdrop-filter: blur(8px);
    background: var(--common-shadow-t-2);
    color: var(--tgc-od-red);
    font-family: var(--font-title);
    font-size: 12px;
    font-weight: normal;
    place-items: center;
  }
}
</style>
