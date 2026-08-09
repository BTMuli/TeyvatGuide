<template>
  <TwgCatalog
    :count="cardsInfo.length"
    icon="mdi-sword-cross"
    title="武器图鉴"
    unit="件武器"
    @filter="showSelect = true"
    @reset="resetSelect = true"
  >
    <template #list>
      <TwcListItem
        v-for="item in cardsInfo"
        :key="item.id"
        v-model:cur-item="curItem"
        :data="item"
        mode="weapon"
        @click="switchW(item)"
      />
    </template>
    <TwcWeapon :item="curItem" @error="toOuter(curItem)" />
  </TwgCatalog>
  <TwoSelectW v-model="showSelect" v-model:reset="resetSelect" @select-w="handleSelectW" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwcListItem from "@comp/pageWiki/twc-list-item.vue";
import TwcWeapon from "@comp/pageWiki/twc-weapon.vue";
import TwgCatalog from "@comp/pageWiki/twg-catalog.vue";
import TwoSelectW, { type SelectedWValue } from "@comp/pageWiki/two-select-w.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AppWeaponData } from "@/data/index.js";

const appWData = AppWeaponData.sort((a, b) => {
  if (a.star !== b.star) return b.star - a.star;
  if (a.weapon !== b.weapon) return a.weapon.localeCompare(b.weapon);
  return b.id - a.id;
});

const route = useRoute();
const router = useRouter();
const showSelect = ref<boolean>(false);
const resetSelect = ref<boolean>(false);
const cardsInfo = shallowRef<Array<TGApp.App.Weapon.WikiBriefInfo>>(appWData);
const curItem = shallowRef<TGApp.App.Weapon.WikiBriefInfo>({
  id: 0,
  contentId: 0,
  name: "",
  star: 0,
  weapon: "",
});

function loadCurItem(id: string): void {
  if (id === "0") {
    curItem.value = cardsInfo.value[0];
    return;
  }
  const item = cardsInfo.value.find((item) => item.id.toString() === id);
  if (item) {
    curItem.value = item;
    return;
  }
  showSnackbar.warn(`武器 ${id} 不存在`);
  curItem.value = cardsInfo.value[0];
}

watch(
  () => route.params.id,
  (newId) => loadCurItem((newId ?? 0).toString()),
  { immediate: true },
);

watch(
  () => resetSelect.value,
  () => {
    if (resetSelect.value) {
      cardsInfo.value = appWData;
    }
  },
);

function switchW(item: TGApp.App.Weapon.WikiBriefInfo): void {
  curItem.value = item;
  router.replace({ params: { id: item.id.toString() } });
}

function handleSelectW(val: SelectedWValue): void {
  showSelect.value = false;
  const filterW = AppWeaponData.filter((item) => {
    if (val.star.length > 0 && !val.star.includes(item.star)) return false;
    return !(val.weapon.length > 0 && !val.weapon.includes(item.weapon));
  });
  if (filterW.length === 0) {
    showSnackbar.warn("未找到符合条件的武器");
    return;
  }
  showSnackbar.success(`找到 ${filterW.length} 件符合条件的武器`);
  cardsInfo.value = filterW;
}

async function toOuter(item?: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  if (!item) return;
  if (item.contentId === 0) {
    showSnackbar.warn(`武器 ${item.name} 暂无观测枢页面`);
    return;
  }
  const check = await showDialog.check(`武器 ${item.name} 暂无数据`, "是否打开观测枢页面？");
  if (!check) {
    showSnackbar.cancel("已取消打开观测枢页面");
    return;
  }
  await toObcPage(item.contentId);
}
</script>
