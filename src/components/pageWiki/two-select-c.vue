<!-- 角色筛选 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按角色属性组合筛选，可同时选择多个条件"
    title="筛选角色"
    @confirm="confirmSelect"
  >
    <div class="twf-grid twf-grid-3">
      <section class="twf-group">
        <div class="twf-group-title">星级</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedStar" :items="starOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group">
        <div class="twf-group-title">衣装</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedCostume" :items="costumeOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group">
        <div class="twf-group-title">特殊强化</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedTeam" :items="teamOpts" size="small">
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
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">元素</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedElements" :items="elementOpts" size="small">
            <template #all>全选</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">所属地区或阵营</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedArea" :items="areaOpts" size="small">
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

export type SelectedCValue = {
  costume: Array<string>;
  star: Array<number>;
  weapon: Array<string>;
  elements: Array<string>;
  team: Array<number>;
  area: Array<string>;
};
type TwoSelectCEmits = { "select-c": [v: SelectedCValue] };

const emits = defineEmits<TwoSelectCEmits>();
const costumeOpts: Array<UavSelectChipsItem> = [
  { label: "有", value: "true", title: "有额外衣装" },
  { label: "无", value: "false", title: "无额外衣装" },
];
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
const elementOpts: Array<UavSelectChipsItem> = ["冰", "岩", "水", "火", "草", "雷", "风"].map(
  (i) => ({
    label: `${i}元素`,
    value: i,
    title: `${i}元素`,
    icon: `/icon/element/${i}元素.webp`,
  }),
);
const teamOpts: Array<UavSelectChipsItem> = [
  { label: "无", value: "0", title: "无特殊强化" },
  { label: "魔导", value: "1", title: "魔导强化" },
  { label: "月兆", value: "2", title: "月兆强化" },
];
const areaOpts: Array<UavSelectChipsItem> = [
  "蒙德",
  "璃月",
  "稻妻",
  "须弥",
  "枫丹",
  "纳塔",
  "至冬",
  "挪德卡莱",
  "愚人众",
  "魔女会",
  "其他",
].map((i) => ({ label: i, value: i, title: i }));

const selectedCostume = ref<Array<string>>([]);
const selectedStar = ref<Array<string>>([]);
const selectedWeapon = ref<Array<string>>([]);
const selectedElements = ref<Array<string>>([]);
const selectedTeam = ref<Array<string>>([]);
const selectedArea = ref<Array<string>>([]);
const oldVal = shallowRef<SelectedCValue>({
  costume: [],
  star: [],
  weapon: [],
  elements: [],
  team: [],
  area: [],
});
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(selectedCostume.value, costumeOpts) &&
        isNotFilter(selectedStar.value, starOpts) &&
        isNotFilter(selectedWeapon.value, weaponOpts) &&
        isNotFilter(selectedElements.value, elementOpts) &&
        isNotFilter(selectedTeam.value, teamOpts) &&
        isNotFilter(selectedArea.value, areaOpts)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedCostume.value = [];
      selectedStar.value = [];
      selectedWeapon.value = [];
      selectedElements.value = [];
      selectedTeam.value = [];
      selectedArea.value = [];
      oldVal.value = { costume: [], star: [], weapon: [], elements: [], team: [], area: [] };
      resetModel.value = false;
      showSnackbar.success("已重置");
    }
  },
);

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      selectedCostume.value = oldVal.value.costume;
      selectedStar.value = oldVal.value.star.map(String);
      selectedWeapon.value = oldVal.value.weapon;
      selectedArea.value = oldVal.value.area;
      selectedElements.value = oldVal.value.elements;
      selectedTeam.value = oldVal.value.team.map(String);
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
  const value: SelectedCValue = {
    costume: selectedCostume.value,
    star: selectedStar.value.map(Number),
    weapon: selectedWeapon.value,
    elements: selectedElements.value,
    team: selectedTeam.value.map(Number),
    area: selectedArea.value,
  };
  emits("select-c", value);
  oldVal.value = value;
  visible.value = false;
}
</script>
