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
import { onBeforeMount, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";

import { AppWeaponData } from "@/data/index.js";

const sortedData = AppWeaponData.sort((a, b) => {
  if (a.star !== b.star) return b.star - a.star;
  if (a.weapon !== b.weapon) return a.weapon.localeCompare(b.weapon);
  return b.id - a.id;
});

const id = useRoute().params.id.toString() ?? "0";
const showSelect = ref<boolean>(false);
const resetSelect = ref<boolean>(false);
const cardsInfo = shallowRef<Array<TGApp.App.Weapon.WikiBriefInfo>>(sortedData);
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

function switchW(item: TGApp.App.Weapon.WikiBriefInfo): void {
  curItem.value = item;
}

function handleSelectW(val: SelectedWValue) {
  if (!val.isReset) showSelect.value = true;
  const filterW = AppWeaponData.filter((item) => {
    if (!val.star.includes(item.star)) return false;
    return val.weapon.includes(item.weapon);
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
<style lang="css" scoped>
.ww-box {
  position: relative;
  display: flex;
  max-height: calc(100vh - 40px);
  column-gap: 10px;
}

.ww-left {
  display: flex;
  width: 500px;
  flex-direction: column;
  gap: 10px;
}

.ww-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.ww-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.ww-list {
  position: relative;
  display: grid;
  width: 500px;
  height: calc(100% - 40px);
  padding-right: 10px;
  gap: 10px;
  grid-auto-rows: 45px;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  overflow-y: auto;
}

.ww-detail {
  position: relative;
  height: calc(100vh - 40px);
  max-height: 100%;
  box-sizing: border-box;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
