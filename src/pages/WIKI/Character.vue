<!-- TODO: UI一致性 -->
<template>
  <div class="wc-box">
    <div class="wc-left">
      <div class="wc-select">
        <v-btn class="wc-btn" @click="showSelect = true">筛选角色</v-btn>
        <v-btn class="wc-btn" @click="resetSelect = true">重置筛选</v-btn>
      </div>
      <div class="wc-list">
        <TwcListItem
          v-for="(item, index) in cardsInfo"
          :key="index"
          v-model:cur-item="curItem"
          :data="item"
          mode="character"
          @click="switchC(item)"
        />
      </div>
    </div>
    <div class="wc-detail">
      <TwcCharacter :item="curItem" />
    </div>
  </div>
  <TwoSelectC v-model="showSelect" v-model:reset="resetSelect" @select-c="handleSelect" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwcCharacter from "@comp/pageWiki/twc-character.vue";
import TwcListItem from "@comp/pageWiki/twc-list-item.vue";
import TwoSelectC, { type SelectedCValue } from "@comp/pageWiki/two-select-c.vue";
import { toObcPage } from "@utils/TGWindow.js";
import { onBeforeMount, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import { AppCharacterData } from "@/data/index.js";

// 先按star降序，再按元素排序，再按id降序
const appCData = AppCharacterData.sort((a, b) => {
  if (a.star !== b.star) return b.star - a.star;
  if (a.element !== b.element) return a.element.localeCompare(b.element);
  return b.id - a.id;
});

const id = useRoute().params.id.toString() ?? "0";
const showSelect = ref<boolean>(false);
const resetSelect = ref<boolean>(false);
const cardsInfo = shallowRef<Array<TGApp.App.Character.WikiBriefInfo>>(appCData);
const curItem = shallowRef<TGApp.App.Character.WikiBriefInfo>({
  id: 0,
  contentId: 0,
  name: "",
  title: "",
  area: "",
  birthday: [0, 0],
  star: 0,
  element: "",
  weapon: "",
  nameCard: "",
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
  showSnackbar.warn(`角色 ${id} 不存在`);
  curItem.value = cardsInfo.value[0];
});

watch(
  () => resetSelect.value,
  (val) => {
    if (val) cardsInfo.value = AppCharacterData;
  },
);

function handleSelect(val: SelectedCValue): void {
  showSelect.value = false;
  const filterC = AppCharacterData.filter((item) => {
    if (!val.star.includes(item.star)) return false;
    if (!val.weapon.includes(item.weapon)) return false;
    if (!val.elements.includes(item.element)) return false;
    return val.area.includes(item.area);
  });
  if (filterC.length === 0) {
    showSnackbar.warn("未找到符合条件的角色");
    return;
  }
  showSnackbar.success(`筛选出符合条件的角色 ${filterC.length} 个`);
  cardsInfo.value = filterC;
}

async function switchC(item: TGApp.App.Character.WikiBriefInfo): Promise<void> {
  if (item.id === 10000005 || item.id === 10000007) {
    await toOuter(item);
    return;
  }
  curItem.value = item;
}

async function toOuter(item?: TGApp.App.Character.WikiBriefInfo): Promise<void> {
  if (!item) return;
  if (item.contentId === 0) {
    showSnackbar.warn(`角色 ${item.name} 暂无观测枢页面`);
    return;
  }
  const openCheck = await showDialog.check(`角色 ${item.name} 暂无数据`, "是否打开观测枢页面？");
  if (!openCheck) {
    showSnackbar.cancel("已取消打开观测枢页面");
    return;
  }
  await toObcPage(item.contentId);
}
</script>
<style lang="scss" scoped>
.wc-box {
  position: relative;
  display: flex;
  height: calc(100vh - 40px);
  column-gap: 10px;
}

.wc-left {
  display: flex;
  width: 500px;
  flex-direction: column;
  gap: 10px;
}

.wc-select {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.wc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.wc-list {
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

.wc-detail {
  max-height: 100%;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
