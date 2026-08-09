<!-- 武器筛选 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按武器星级与类型组合筛选"
    title="筛选武器"
    @confirm="confirmSelect"
  >
    <div class="twf-grid">
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">星级</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedStar" :items="starOpts" size="small">
            <template #all>全部</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-weapon twf-group-wide">
        <div class="twf-group-title">武器类型</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedWeapon" :items="weaponOpts" size="small">
            <template #all>全部</template>
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

export type SelectedWValue = { star: Array<number>; weapon: Array<string> };
type TwoSelectWEmits = (e: "select-w", value: SelectedWValue) => void;

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
const oldVal = shallowRef<SelectedWValue>({ star: [], weapon: [] });
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(selectedStar.value, starOpts) &&
        isNotFilter(selectedWeapon.value, weaponOpts)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = [];
      selectedWeapon.value = [];
      oldVal.value = { star: [], weapon: [] };
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
  };
  emits("select-w", value);
  oldVal.value = value;
  visible.value = false;
}
</script>
