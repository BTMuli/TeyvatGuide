<!-- 圣遗物筛选 -->
<template>
  <TwfFilterShell
    v-model="visible"
    description="按圣遗物星级、部位与套装构成组合筛选"
    title="筛选圣遗物"
    @confirm="confirmSelect"
  >
    <div class="twf-grid">
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">最高星级</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedStar" :items="starOpts" size="small">
            <template #all>全部</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-weapon twf-group-wide">
        <div class="twf-group-title">包含部位</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedPos" :items="posOpts" size="small">
            <template #all>全部</template>
          </UavSelectChips>
        </div>
      </section>
      <section class="twf-group twf-group-wide">
        <div class="twf-group-title">套装构成</div>
        <div class="twf-options">
          <UavSelectChips v-model:selected="selectedPieces" :items="pieceOpts" size="small">
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
import wikiUtils from "@utils/wikiUtils.js";
import { ref, shallowRef, watch } from "vue";

export type SelectedRValue = {
  pieces: Array<number>;
  pos: Array<number>;
  star: Array<number>;
};
type TwoSelectREmits = { "select-r": [value: SelectedRValue] };

const emits = defineEmits<TwoSelectREmits>();
const starOpts: Array<UavSelectChipsItem> = [3, 4, 5].map((i) => ({
  label: `${i}星`,
  value: i.toString(),
  title: `${i}星`,
}));
const posOpts: Array<UavSelectChipsItem> = [1, 2, 3, 4, 5].map((i) => ({
  label: wikiUtils.relic.pos(i),
  value: i.toString(),
  title: wikiUtils.relic.pos(i),
  icon: `/icon/relic/${i}.webp`,
}));
const pieceOpts: Array<UavSelectChipsItem> = [
  { label: "五件套", value: "5", title: "完整五件套" },
  { label: "单件套", value: "1", title: "仅单一部件" },
];

const selectedStar = ref<Array<string>>([]);
const selectedPos = ref<Array<string>>([]);
const selectedPieces = ref<Array<string>>([]);
const oldVal = shallowRef<SelectedRValue>({ pieces: [], pos: [], star: [] });
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(selectedStar.value, starOpts) &&
        isNotFilter(selectedPos.value, posOpts) &&
        isNotFilter(selectedPieces.value, pieceOpts)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = [];
      selectedPos.value = [];
      selectedPieces.value = [];
      oldVal.value = { pieces: [], pos: [], star: [] };
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
      selectedPos.value = oldVal.value.pos.map(String);
      selectedPieces.value = oldVal.value.pieces.map(String);
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
  const value: SelectedRValue = {
    pieces: selectedPieces.value.map(Number),
    pos: selectedPos.value.map(Number),
    star: selectedStar.value.map(Number),
  };
  emits("select-r", value);
  oldVal.value = value;
  visible.value = false;
}
</script>
