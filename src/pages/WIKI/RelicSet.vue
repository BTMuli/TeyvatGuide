<!-- 圣遗物套装WIKI -->
<template>
  <TwgCatalog
    v-model:search="searchKeyword"
    :count="visibleSets.length"
    icon="mdi-shield-star-outline"
    search-placeholder="搜索套装名称"
    title="圣遗物图鉴"
    unit="套圣遗物"
    @filter="showSelect = true"
    @reset="resetCatalog"
  >
    <template #list>
      <PwRelicSetItem
        v-for="set in visibleSets"
        :key="set.id"
        :selected="curSet?.id === set.id"
        :set
        @click="switchR(set)"
      />
    </template>
    <PwdRelicSet v-if="curSet" :set="curSet" />
  </TwgCatalog>
  <TwoSelectR v-model="showSelect" v-model:reset="resetSelect" @select-r="handleSelect" />
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PwRelicSetItem from "@comp/pageWiki/pw-relic-set-item.vue";
import PwdRelicSet from "@comp/pageWiki/pwd-relic-set.vue";
import TwgCatalog from "@comp/pageWiki/twg-catalog.vue";
import TwoSelectR, { type SelectedRValue } from "@comp/pageWiki/two-select-r.vue";
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { wrSet } from "@/data/index.js";

const appRsData = wrSet.sort((a, b) => b.maxStar - a.maxStar || b.id - a.id);

const route = useRoute();
const router = useRouter();
const showSelect = ref<boolean>(false);
const resetSelect = ref<boolean>(false);
const searchKeyword = ref<string | null>("");
const cardsInfo = shallowRef<Array<TGApp.App.Relic.SetItem>>(appRsData);
const visibleSets = computed<Array<TGApp.App.Relic.SetItem>>(() => {
  const keyword = searchKeyword.value?.trim().toLocaleLowerCase() ?? "";
  if (keyword.length === 0) return cardsInfo.value;
  return cardsInfo.value.filter((item) => item.name.toLocaleLowerCase().includes(keyword));
});
const curSet = shallowRef<TGApp.App.Relic.SetItem>();

watch(
  () => route.params.id,
  (newId) => loadCurSet((newId ?? 0).toString()),
  { immediate: true },
);

watch(
  () => resetSelect.value,
  (val) => {
    if (val) cardsInfo.value = appRsData;
  },
);

function loadCurSet(id: string): void {
  if (id === "0") {
    curSet.value = cardsInfo.value[0];
    return;
  }
  const item = cardsInfo.value.find((set) => set.id.toString() === id);
  if (item) {
    curSet.value = item;
    return;
  }
  showSnackbar.warn(`圣遗物套装 ${id} 不存在`);
  curSet.value = cardsInfo.value[0];
}

function handleSelect(val: SelectedRValue): void {
  showSelect.value = false;
  const filterR = appRsData.filter((item) => {
    if (val.star.length > 0 && !val.star.includes(item.maxStar)) return false;
    if (val.pos.length > 0 && !val.pos.some((pos) => item.pos.includes(pos))) return false;
    return !(val.pieces.length > 0 && !val.pieces.includes(item.pos.length));
  });
  if (filterR.length === 0) {
    showSnackbar.warn("未找到符合条件的圣遗物套装");
    return;
  }
  showSnackbar.success(`筛选出符合条件的圣遗物套装 ${filterR.length} 套`);
  cardsInfo.value = filterR;
}

function resetCatalog(): void {
  const hasFilter = cardsInfo.value !== appRsData;
  searchKeyword.value = "";
  cardsInfo.value = appRsData;
  if (hasFilter) resetSelect.value = true;
}

function switchR(set: TGApp.App.Relic.SetItem): void {
  curSet.value = set;
  router.replace({ params: { id: set.id.toString() } });
}
</script>
