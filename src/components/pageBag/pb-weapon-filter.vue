<!-- 武器筛选浮窗 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按武器星级、类型、精炼等级与词条组合筛选"
    title="筛选武器"
    topOffset="64px"
    @confirm="confirmSelect"
  >
    <div class="pbwf-content">
      <div class="twf-grid pbwf-basic-row">
        <section class="twf-group">
          <div class="twf-group-title">星级</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedStar" :items="starList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group">
          <div class="twf-group-title">精炼等级</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedRefine" :items="refineList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>

      <div class="pbwf-weapon-status-row">
        <section class="twf-group twf-group-weapon pbwf-weapon-type-group">
          <div class="twf-group-title">武器类型</div>
          <div class="twf-options">
            <UavSelectChips
              v-model:selected="selectedWeaponType"
              :items="weaponTypeList"
              size="small"
            >
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
        <section class="twf-group pbwf-status-group">
          <div class="twf-group-title">状态</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedStatus" :items="statusList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>

      <div class="twf-grid">
        <section class="twf-group twf-group-weapon twf-group-wide">
          <div class="twf-group-title">副词条</div>
          <div class="twf-options">
            <UavSelectChips v-model:selected="selectedSubProp" :items="subPropList" size="small">
              <template #all>全选</template>
            </UavSelectChips>
          </div>
        </section>
      </div>
    </div>

    <template #footer>
      <span class="pbwf-footer-hint">未选择或全选均表示不限</span>
      <div class="pbwf-actions">
        <v-btn class="pbwf-reset" variant="text" @click="resetFilter">重置</v-btn>
        <v-btn class="pbwf-confirm" prepend-icon="mdi-check" variant="flat" @click="confirmSelect">
          确定
        </v-btn>
      </div>
    </template>
  </TwfFilterShell>
</template>
<script lang="ts" setup>
import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
import UavSelectChips, { type UavSelectChipsItem } from "@comp/userAvatar/uav-select-chips.vue";
import { ref, watch } from "vue";

import { AppPropMapData, wwWeapon } from "@/data/index.js";

export type WeaponFilterValue = {
  star: Array<number>;
  weaponType: Array<string>;
  refine: Array<number>;
  subProp: Array<number>;
  locked: boolean | null;
};

type PbWeaponFilterEmits = { filter: [v: WeaponFilterValue] };

const emits = defineEmits<PbWeaponFilterEmits>();

const starList: Array<UavSelectChipsItem> = [1, 2, 3, 4, 5].map((star) => ({
  label: `${star}星`,
  value: star.toString(),
  title: `${star}星`,
}));

const weaponTypeList: Array<UavSelectChipsItem> = [
  "单手剑",
  "双手剑",
  "长柄武器",
  "法器",
  "弓",
].map((weaponType) => ({
  label: weaponType,
  value: weaponType,
  title: weaponType,
  icon: `/icon/weapon/${weaponType}.webp`,
}));

const refineList: Array<UavSelectChipsItem> = [1, 2, 3, 4, 5].map((refine) => ({
  label: `精${refine}`,
  value: refine.toString(),
  title: `精${refine}`,
}));

const statusList: Array<UavSelectChipsItem> = [
  { label: "锁定", value: "locked", title: "锁定" },
  { label: "未锁定", value: "unlocked", title: "未锁定" },
];

const subPropList: Array<UavSelectChipsItem> = (() => {
  const propSet = new Set<number>();
  for (const weapon of wwWeapon) {
    if (weapon.curves) {
      for (const curve of weapon.curves) {
        if (curve.curve !== 1101) propSet.add(curve.prop);
      }
    }
  }
  return Array.from(propSet).map((propId) => {
    const propInfo = AppPropMapData[propId];
    return {
      label: propInfo ? propInfo.filter_name : `属性${propId}`,
      value: propId.toString(),
      title: propInfo ? propInfo.filter_name : `属性${propId}`,
      icon: propInfo ? propInfo.icon : "",
    };
  });
})();

const selectedStar = ref<Array<string>>([]);
const selectedWeaponType = ref<Array<string>>([]);
const selectedRefine = ref<Array<string>>([]);
const selectedSubProp = ref<Array<string>>([]);
const selectedStatus = ref<Array<string>>([]);

const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      selectedStar.value = [];
      selectedWeaponType.value = [];
      selectedRefine.value = [];
      selectedSubProp.value = [];
      selectedStatus.value = [];
      resetModel.value = false;
    }
  },
);

function resetFilter(): void {
  selectedStar.value = [];
  selectedWeaponType.value = [];
  selectedRefine.value = [];
  selectedSubProp.value = [];
  selectedStatus.value = [];
  confirmSelect();
}

function getBooleanFilter(
  selectedValues: ReadonlyArray<string>,
  trueValue: string,
  falseValue: string,
): boolean | null {
  const hasTrueValue = selectedValues.includes(trueValue);
  const hasFalseValue = selectedValues.includes(falseValue);
  return hasTrueValue === hasFalseValue ? null : hasTrueValue;
}

function confirmSelect(): void {
  const value: WeaponFilterValue = {
    star: selectedStar.value.map(Number),
    weaponType: selectedWeaponType.value,
    refine: selectedRefine.value.map(Number),
    subProp: selectedSubProp.value.map(Number),
    locked: getBooleanFilter(selectedStatus.value, "locked", "unlocked"),
  };
  emits("filter", value);
  visible.value = false;
}
</script>
<style lang="scss" scoped>
.pbwf-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12px;
}

.pbwf-weapon-status-row {
  display: flex;
  width: 100%;
  align-items: stretch;
  gap: 12px;
}

.pbwf-weapon-type-group {
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
}

.pbwf-status-group {
  min-width: 0;
  flex: 1 1 auto;
}

.pbwf-footer-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.pbwf-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.pbwf-reset,
.pbwf-confirm {
  border-radius: 4px;
  font-family: var(--font-text);
}

.pbwf-reset {
  color: var(--box-text-2);
}

.pbwf-confirm {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

@media (width <= 720px) {
  .pbwf-weapon-status-row {
    flex-direction: column;
  }

  .pbwf-weapon-type-group,
  .pbwf-status-group {
    width: 100%;
  }
}
</style>
