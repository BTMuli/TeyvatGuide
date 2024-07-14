<template>
  <div class="ww-box">
    <div class="ww-left">
      <div class="ww-select">
        <v-btn @click="showSelect = true">
          <span>筛选武器</span>
        </v-btn>
        <v-btn @click="resetSelect = true">重置筛选</v-btn>
      </div>
      <div class="ww-list">
        <TwcListItem
          v-for="(item, index) in cardsInfo"
          v-model:cur-item="curItem"
          :key="index"
          :data="item"
          @click="switchW(item)"
          mode="weapon"
        />
      </div>
    </div>
    <div class="ww-detail">
      <TwcWeapon :item="curItem" @error="toOuter(curItem)" />
    </div>
  </div>
  <TwoSelectW v-model="showSelect" @select-w="handleSelectW" v-model:reset="resetSelect" />
</template>

<script lang="ts" setup>
import { onBeforeMount, ref } from "vue";
import { useRoute } from "vue-router";

import showConfirm from "../../components/func/confirm.js";
import showSnackbar from "../../components/func/snackbar.js";
import TwcListItem from "../../components/wiki/twc-list-item.vue";
import TwcWeapon from "../../components/wiki/twc-weapon.vue";
import TwoSelectW, { SelectedWValue } from "../../components/wiki/two-select-w.vue";
import { AppWeaponData } from "../../data/index.js";
import Mys from "../../plugins/Mys/index.js";
import { createTGWindow } from "../../utils/TGWindow.js";

const id = useRoute().params.id.toString() ?? "0";
const showSelect = ref(false);
const resetSelect = ref(false);
const cardsInfo = ref(AppWeaponData);
// todo，这边赋予了默认值，需要经过测试
const curItem = ref<TGApp.App.Weapon.WikiBriefInfo>({
  id: 0,
  contentId: 0,
  name: "",
  star: 0,
  bg: "",
  weaponIcon: "",
  icon: "",
});

onBeforeMount(() => {
  if (id === "0") {
    curItem.value = cardsInfo.value[0];
  } else {
    const item = cardsInfo.value.find((item) => item.id.toString() === id);
    if (item) {
      curItem.value = item;
    } else {
      showSnackbar({
        text: `武器 ${id} 不存在`,
        color: "warn",
      });
      curItem.value = cardsInfo.value[0];
    }
  }
});

function handleSelectW(val: SelectedWValue) {
  showSelect.value = true;
  const reg = /\/icon\/weapon\/(.+?)\.webp/;
  const filterW = AppWeaponData.filter((item) => {
    if (!val.star.includes(item.star)) return false;
    const match = item.weaponIcon.match(reg);
    if (match === null) return false;
    return val.weapon.includes(match[1]);
  });
  if (filterW.length === 0) {
    showSnackbar({
      text: "未找到符合条件的武器",
      color: "warn",
    });
    return;
  }
  showSnackbar({
    text: `找到 ${filterW.length} 件符合条件的武器`,
  });
  cardsInfo.value = filterW;
}

async function switchW(item: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  curItem.value = item;
}

async function toOuter(item?: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  if (!item) return;
  if (item.contentId === 0) {
    showSnackbar({
      text: `武器 ${item.name} 暂无观测枢页面`,
      color: "warn",
    });
    return;
  }
  const confirm = await showConfirm({
    title: `武器 ${item.name} 暂无数据`,
    text: "是否打开观测枢页面？",
  });
  if (!confirm) {
    showSnackbar({
      text: "已取消",
      color: "cancel",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", item.contentId.toString());
  await createTGWindow(
    url,
    "Sub_window",
    `Content_${item.contentId} ${item.name}`,
    1200,
    800,
    true,
  );
}
</script>
<style scoped>
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
  max-height: 100%;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
