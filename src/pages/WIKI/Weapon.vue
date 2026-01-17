<!-- 武器Wiki TODO: UI一致性 -->
<template>
  <div class="ww-box">
    <div class="ww-left">
      <div class="ww-select">
        <v-btn class="ww-btn" @click="showSelect = true">筛选武器</v-btn>
        <v-btn class="ww-btn" @click="resetSelect = true">重置筛选</v-btn>
      </div>
      <div class="ww-list">
        <TwcListItem
          v-for="(item, index) in cardsInfo"
          :key="index"
          v-model:cur-item="curItem"
          :data="item"
          mode="weapon"
          @click="switchW(item)"
        />
      </div>
    </div>
    <div class="ww-detail">
      <TwcWeapon :item="curItem" @error="toOuter(curItem)" />
    </div>
  </div>
  <TwoSelectW v-model="showSelect" v-model:reset="resetSelect" @select-w="handleSelectW" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwcListItem from "@comp/pageWiki/twc-list-item.vue";
import TwcWeapon from "@comp/pageWiki/twc-weapon.vue";
import TwoSelectW, { type SelectedWValue } from "@comp/pageWiki/two-select-w.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { onBeforeMount, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { AppWeaponData } from "@/data/index.js";

const appWData = AppWeaponData.sort((a, b) => {
  if (a.star !== b.star) return b.star - a.star;
  if (a.weapon !== b.weapon) return a.weapon.localeCompare(b.weapon);
  return b.id - a.id;
});

const id = useRoute().params.id.toString() ?? "0";
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

onBeforeMount(() => {
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
});

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
}

function handleSelectW(val: SelectedWValue) {
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
<style lang="scss" scoped>
.ww-box {
  position: relative;
  display: flex;
  max-height: calc(100vh - 32px);
  column-gap: 8px;
}

.ww-left {
  display: flex;
  width: fit-content;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
}

.ww-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.ww-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.ww-list {
  position: relative;
  display: grid;
  overflow: hidden auto;
  width: 100%;
  padding-right: 8px;
  gap: 8px;
  grid-template-columns: repeat(3, 160px);
}

.ww-detail {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 0 4px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
