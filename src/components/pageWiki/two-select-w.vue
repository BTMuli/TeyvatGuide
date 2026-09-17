<!-- 武器筛选 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按武器星级、类型与副词条组合筛选"
    title="筛选武器"
    @confirm="confirmSelect"
  >
    <div class="twf-grid">
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">星级</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedStar" :items="starOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-weapon twf-group-wide">
        <div class="twf-group-title">武器类型</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedWeapon" :items="weaponOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-weapon twf-group-wide">
        <div class="twf-group-title">副词条</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedSubProp" :items="subPropOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
    </div>
  </TwfFilterShell>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TwfFilterShell from "@comp/pageWiki/twf-filter-shell.vue";
import UavSelectChips, { type UavSelectChipsItem } from "@comp/userAvatar/uav-select-chips.vue";
import { ref, shallowRef, watch } from "vue";

import { AppPropMapData } from "@/data/index.js";

export type SelectedWValue = {
  star: Array<number>;
  weapon: Array<string>;
  subProp: Array<number>;
};
type TwoSelectWEmits = { "select-w": [value: SelectedWValue] };

const emits = defineEmits<TwoSelectWEmits>();
const starOpts: Array<UavSelectChipsItem> = [4, 5].map((i) => ({
  label: `${i}星`,
  value: i.toString(),
  title: `${i}星`,
}));
const weaponOpts: Array<UavSelectChipsItem> = ["单手剑", "双手剑", "弓", "法器", "长柄武器"].map(
  (i) => ({
    label: i,
    value: i,
    title: i,
    icon: `/icon/weapon/${i}.webp`,
  }),
);

const selectedStar = ref<Array<string>>([]);
const selectedWeapon = ref<Array<string>>([]);
const subPropOpts: Array<UavSelectChipsItem> = [6, 23, 9, 3, 20, 22, 28, 30].map((id) => ({
  label: AppPropMapData[id].filter_name,
  value: id.toString(),
  title: AppPropMapData[id].filter_name,
  icon: AppPropMapData[id].icon,
}));
const selectedSubProp = ref<Array<string>>([]);
const oldVal = shallowRef<SelectedWValue>({ star: [], weapon: [], subProp: [] });
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(oldVal.value.star.map(String), starOpts) &&
        isNotFilter(oldVal.value.weapon, weaponOpts) &&
        isNotFilter(oldVal.value.subProp.map(String), subPropOpts)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = [];
      selectedWeapon.value = [];
      selectedSubProp.value = [];
      oldVal.value = { star: [], weapon: [], subProp: [] };
      resetModel.value = false;
      showSnackbar.success("已重置");
    }
  },
);

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      selectedStar.value = oldVal.value.star.map(String);
      selectedWeapon.value = oldVal.value.weapon;
      selectedSubProp.value = oldVal.value.subProp.map(String);
    }
  },
);

function isNotFilter(
  list: ReadonlyArray<string>,
  data: ReadonlyArray<UavSelectChipsItem>,
): boolean {
  return list.length === 0 || list.length === data.length;
}

function confirmSelect(): void {
  const value: SelectedWValue = {
    star: selectedStar.value.map(Number),
    weapon: selectedWeapon.value,
    subProp:
      selectedSubProp.value.length === subPropOpts.length ? [] : selectedSubProp.value.map(Number),
  };
  emits("select-w", value);
  oldVal.value = value;
  visible.value = false;
}
</script>
